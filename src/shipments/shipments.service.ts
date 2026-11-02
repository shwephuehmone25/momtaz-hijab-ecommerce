import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Temporal as TemporalApi } from 'temporal-polyfill';
import { varchar } from '../common/database/varchar';
import { db } from '../database/db';
import {
  CreateShipmentDto,
  ShipmentStatus,
  ShipmentsQueryDto,
  UpdateShipmentDto,
} from './dto';

type Database = { orm: typeof db.orm };
type ShipmentRow = {
  id: number;
  orderId: number;
  trackingNumber: string | null;
  carrier: string | null;
  status: string;
  shippedAt: TemporalApi.PlainDateTime | null;
  deliveredAt: TemporalApi.PlainDateTime | null;
  createdAt: TemporalApi.PlainDateTime;
  updatedAt: TemporalApi.PlainDateTime;
  order: {
    id: number;
    customerId: number;
    status: string;
    shippingName: string;
    shippingPhone: string;
    shippingAddressLine1: string;
    shippingAddressLine2: string | null;
    shippingCity: string;
    shippingState: string | null;
    shippingPostalCode: string | null;
    shippingCountry: string;
  } | null;
};

const shipmentTransitions: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  PENDING: [ShipmentStatus.PROCESSING, ShipmentStatus.CANCELLED],
  PROCESSING: [ShipmentStatus.SHIPPED, ShipmentStatus.CANCELLED],
  SHIPPED: [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.RETURNED,
  ],
  IN_TRANSIT: [ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED],
  DELIVERED: [ShipmentStatus.RETURNED],
  RETURNED: [],
  CANCELLED: [],
};

const shippedStatuses = new Set<ShipmentStatus>([
  ShipmentStatus.SHIPPED,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.DELIVERED,
  ShipmentStatus.RETURNED,
]);

@Injectable()
export class ShipmentsService {
  private shipmentQuery(database: Database = db) {
    return database.orm.public.Shipment.select(
      'id',
      'orderId',
      'trackingNumber',
      'carrier',
      'status',
      'shippedAt',
      'deliveredAt',
      'createdAt',
      'updatedAt',
    ).include('order', (order) =>
      order.select(
        'id',
        'customerId',
        'status',
        'shippingName',
        'shippingPhone',
        'shippingAddressLine1',
        'shippingAddressLine2',
        'shippingCity',
        'shippingState',
        'shippingPostalCode',
        'shippingCountry',
      ),
    );
  }

  async create(dto: CreateShipmentDto) {
    const status = dto.status ?? ShipmentStatus.PENDING;
    if (![ShipmentStatus.PENDING, ShipmentStatus.PROCESSING].includes(status)) {
      throw new BadRequestException(
        'New shipments must start as PENDING or PROCESSING',
      );
    }
    const dates = this.validateShipmentData(
      status,
      dto.carrier,
      dto.trackingNumber,
      dto.shippedAt,
      dto.deliveredAt,
    );
    const shipmentId = await db.transaction(async (tx) => {
      const order = await this.requireFulfillableOrder(dto.orderId, tx);
      const shipment = await tx.orm.public.Shipment.select('id').create({
        orderId: dto.orderId,
        trackingNumber: this.optionalVarchar<100>(dto.trackingNumber),
        carrier: this.optionalVarchar<50>(dto.carrier),
        status,
        shippedAt: dates.shippedAt,
        deliveredAt: dates.deliveredAt,
      });
      if (order.status === 'CONFIRMED') {
        const updated = await tx.orm.public.Order.where({
          id: order.id,
          status: 'CONFIRMED',
        })
          .select('id')
          .update({ status: 'PROCESSING' });
        if (!updated)
          throw new ConflictException('Order changed; retry the request');
      }
      return shipment.id;
    });
    return this.findOne(shipmentId);
  }

  async findAll(query: ShipmentsQueryDto, customerId?: number) {
    let shipments = this.shipmentQuery();
    let count = db.orm.public.Shipment;
    if (query.orderId !== undefined) {
      if (customerId !== undefined)
        await this.requireOwnedOrder(query.orderId, customerId);
      shipments = shipments.where({ orderId: query.orderId });
      count = count.where({ orderId: query.orderId });
    } else if (customerId !== undefined) {
      const orderIds = await this.customerOrderIds(customerId);
      if (orderIds.length === 0)
        return { items: [], page: query.page, limit: query.limit, total: 0 };
      shipments = shipments.where((shipment) => shipment.orderId.in(orderIds));
      count = count.where((shipment) => shipment.orderId.in(orderIds));
    }
    if (query.status !== undefined) {
      shipments = shipments.where({ status: query.status });
      count = count.where({ status: query.status });
    }
    const [rows, totalResult] = await Promise.all([
      shipments
        .orderBy([
          (shipment) => shipment.createdAt.desc(),
          (shipment) => shipment.id.desc(),
        ])
        .limit(query.limit)
        .offset((query.page - 1) * query.limit)
        .all(),
      count.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);
    return {
      items: rows.map((row) => this.serialize(row)),
      page: query.page,
      limit: query.limit,
      total: totalResult.total,
    };
  }

  async findOne(id: number, customerId?: number) {
    const shipment = await this.shipmentQuery().first({ id });
    if (
      !shipment ||
      !shipment.order ||
      (customerId !== undefined && shipment.order.customerId !== customerId)
    ) {
      throw new NotFoundException(`Shipment ${id} was not found`);
    }
    return this.serialize(shipment);
  }

  async update(id: number, dto: UpdateShipmentDto) {
    await db.transaction(async (tx) => {
      const current = await tx.orm.public.Shipment.select(
        'id',
        'orderId',
        'status',
        'carrier',
        'trackingNumber',
        'shippedAt',
        'deliveredAt',
      ).first({ id });
      if (!current) throw new NotFoundException(`Shipment ${id} was not found`);
      const currentStatus = current.status as ShipmentStatus;
      const nextStatus = dto.status ?? currentStatus;
      if (dto.status !== undefined && dto.status !== currentStatus) {
        this.assertTransition(currentStatus, dto.status);
      }
      if (
        [ShipmentStatus.RETURNED, ShipmentStatus.CANCELLED].includes(
          currentStatus,
        )
      ) {
        throw new ConflictException(
          `${currentStatus.toLowerCase()} shipments cannot be updated`,
        );
      }
      const detailsChanged =
        dto.carrier !== undefined ||
        dto.trackingNumber !== undefined ||
        dto.shippedAt !== undefined ||
        dto.deliveredAt !== undefined;
      if (
        currentStatus === ShipmentStatus.DELIVERED &&
        (nextStatus !== ShipmentStatus.RETURNED || detailsChanged)
      ) {
        throw new ConflictException(
          'Delivered shipments can only transition to returned',
        );
      }
      const carrier = dto.carrier === undefined ? current.carrier : dto.carrier;
      const trackingNumber =
        dto.trackingNumber === undefined
          ? current.trackingNumber
          : dto.trackingNumber;
      const dates = this.validateShipmentData(
        nextStatus,
        carrier,
        trackingNumber,
        // Prisma's generated timestamp output is Temporal.PlainDateTime.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        dto.shippedAt === undefined ? current.shippedAt : dto.shippedAt,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        dto.deliveredAt === undefined ? current.deliveredAt : dto.deliveredAt,
        true,
      );
      const updated = await tx.orm.public.Shipment.where({
        id,
        status: current.status,
      })
        .select('id')
        .update({
          ...(dto.carrier !== undefined && {
            carrier: this.optionalVarchar<50>(dto.carrier),
          }),
          ...(dto.trackingNumber !== undefined && {
            trackingNumber: this.optionalVarchar<100>(dto.trackingNumber),
          }),
          ...(dto.status !== undefined && { status: dto.status }),
          shippedAt: dates.shippedAt,
          deliveredAt: dates.deliveredAt,
        });
      if (!updated)
        throw new ConflictException('Shipment changed; retry the request');
      await this.syncOrderStatus(current.orderId, nextStatus, tx);
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    await db.transaction(async (tx) => {
      const shipment = await tx.orm.public.Shipment.select(
        'id',
        'orderId',
        'status',
      ).first({ id });
      if (!shipment)
        throw new NotFoundException(`Shipment ${id} was not found`);
      if (!['PENDING', 'CANCELLED'].includes(shipment.status)) {
        throw new ConflictException(
          'Only pending or cancelled shipments can be deleted',
        );
      }
      await tx.orm.public.Shipment.where({
        id,
        status: shipment.status,
      }).delete();
      const remaining = await tx.orm.public.Shipment.select('id')
        .where({ orderId: shipment.orderId })
        .limit(1)
        .all();
      if (remaining.length === 0) {
        await tx.orm.public.Order.where({
          id: shipment.orderId,
          status: 'PROCESSING',
        }).update({ status: 'CONFIRMED' });
      }
    });
    return { message: `Shipment ${id} deleted` };
  }

  assertTransition(from: ShipmentStatus, to: ShipmentStatus) {
    if (!shipmentTransitions[from].includes(to)) {
      throw new ConflictException(
        `Shipment status cannot transition from ${from} to ${to}`,
      );
    }
  }

  private async syncOrderStatus(
    orderId: number,
    shipmentStatus: ShipmentStatus,
    database: Database,
  ) {
    const order = await database.orm.public.Order.select('id', 'status').first({
      id: orderId,
    });
    if (!order) throw new NotFoundException(`Order ${orderId} was not found`);
    if (
      [ShipmentStatus.SHIPPED, ShipmentStatus.IN_TRANSIT].includes(
        shipmentStatus,
      )
    ) {
      if (order.status !== 'PROCESSING' && order.status !== 'SHIPPED') {
        throw new ConflictException(
          'Order must be processing before a shipment can be shipped',
        );
      }
      if (order.status === 'PROCESSING') {
        const updated = await database.orm.public.Order.where({
          id: orderId,
          status: 'PROCESSING',
        })
          .select('id')
          .update({ status: 'SHIPPED' });
        if (!updated) {
          throw new ConflictException('Order changed; retry the request');
        }
      }
      return;
    }
    if (shipmentStatus === ShipmentStatus.DELIVERED) {
      if (order.status !== 'SHIPPED' && order.status !== 'DELIVERED') {
        throw new ConflictException(
          'Order must be shipped before delivery can be recorded',
        );
      }
      const active = await database.orm.public.Shipment.select('status')
        .where({ orderId })
        .where((shipment) => shipment.status.neq(ShipmentStatus.CANCELLED))
        .all();
      if (
        active.length > 0 &&
        active.every((shipment) => shipment.status === 'DELIVERED')
      ) {
        await database.orm.public.Order.where({
          id: orderId,
          status: 'SHIPPED',
        }).update({ status: 'DELIVERED' });
      }
    }
  }

  private async requireFulfillableOrder(orderId: number, database: Database) {
    const order = await database.orm.public.Order.select(
      'id',
      'status',
      'shippingName',
      'shippingPhone',
      'shippingAddressLine1',
      'shippingCity',
      'shippingCountry',
    ).first({ id: orderId });
    if (!order) throw new NotFoundException(`Order ${orderId} was not found`);
    if (!['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status)) {
      throw new ConflictException(
        'Shipments can only be created for confirmed or in-progress orders',
      );
    }
    if (
      ![
        order.shippingName,
        order.shippingPhone,
        order.shippingAddressLine1,
        order.shippingCity,
        order.shippingCountry,
      ].every((value) => String(value).trim())
    ) {
      throw new ConflictException('Order shipping address is incomplete');
    }
    return order;
  }

  private async requireOwnedOrder(orderId: number, customerId: number) {
    const order = await db.orm.public.Order.select('id').first({
      id: orderId,
      customerId,
    });
    if (!order) throw new NotFoundException(`Order ${orderId} was not found`);
  }

  private async customerOrderIds(customerId: number) {
    const orders = await db.orm.public.Order.select('id')
      .where({ customerId })
      .all();
    return orders.map((order) => order.id);
  }

  private validateShipmentData(
    status: ShipmentStatus,
    carrier: string | null | undefined,
    trackingNumber: string | null | undefined,
    shippedAtInput: string | TemporalApi.PlainDateTime | null | undefined,
    deliveredAtInput: string | TemporalApi.PlainDateTime | null | undefined,
    autoDates = false,
  ) {
    const requiresTracking = shippedStatuses.has(status);
    if (requiresTracking && (!carrier?.trim() || !trackingNumber?.trim())) {
      throw new BadRequestException(
        'Carrier and tracking number are required once a shipment is shipped',
      );
    }
    let shippedAt = this.toPlainDateTime(shippedAtInput);
    let deliveredAt = this.toPlainDateTime(deliveredAtInput);
    const temporal = this.temporal();
    const now = temporal.Now.instant()
      .toZonedDateTimeISO('UTC')
      .toPlainDateTime();
    if (requiresTracking && !shippedAt && autoDates) shippedAt = now;
    if (status === ShipmentStatus.DELIVERED && !deliveredAt && autoDates)
      deliveredAt = now;
    if (!requiresTracking && (shippedAt || deliveredAt)) {
      throw new BadRequestException(
        'Shipping dates are only valid after a shipment is shipped',
      );
    }
    if (status === ShipmentStatus.DELIVERED && !deliveredAt) {
      throw new BadRequestException(
        'deliveredAt is required for delivered shipments',
      );
    }
    if (
      ![ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED].includes(status) &&
      deliveredAt
    ) {
      throw new BadRequestException(
        'deliveredAt is only valid for delivered shipments',
      );
    }
    if (shippedAt && temporal.PlainDateTime.compare(shippedAt, now) > 0) {
      throw new BadRequestException('shippedAt cannot be in the future');
    }
    if (deliveredAt && temporal.PlainDateTime.compare(deliveredAt, now) > 0) {
      throw new BadRequestException('deliveredAt cannot be in the future');
    }
    if (
      shippedAt &&
      deliveredAt &&
      temporal.PlainDateTime.compare(deliveredAt, shippedAt) < 0
    ) {
      throw new BadRequestException(
        'deliveredAt cannot be earlier than shippedAt',
      );
    }
    return { shippedAt, deliveredAt };
  }

  private toPlainDateTime(
    value: string | TemporalApi.PlainDateTime | null | undefined,
  ): TemporalApi.PlainDateTime | null {
    if (value === null || value === undefined || value === '') return null;
    const temporal = this.temporal();
    if (value instanceof temporal.PlainDateTime) return value;
    const text = value;
    try {
      return temporal.Instant.from(text)
        .toZonedDateTimeISO('UTC')
        .toPlainDateTime();
    } catch {
      try {
        return temporal.PlainDateTime.from(text);
      } catch {
        throw new BadRequestException(
          'Shipment date must be a valid ISO-8601 date-time',
        );
      }
    }
  }

  private optionalVarchar<N extends number>(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? varchar<N>(trimmed) : null;
  }

  private serialize(shipment: ShipmentRow) {
    const { order, ...row } = shipment;
    if (!order) {
      throw new ConflictException('Shipment order association is invalid');
    }
    return {
      ...row,
      shippedAt: row.shippedAt?.toString() ?? null,
      deliveredAt: row.deliveredAt?.toString() ?? null,
      createdAt: row.createdAt.toString(),
      updatedAt: row.updatedAt.toString(),
      orderStatus: order.status,
      shippingAddress: {
        name: order.shippingName,
        phone: order.shippingPhone,
        addressLine1: order.shippingAddressLine1,
        addressLine2: order.shippingAddressLine2,
        city: order.shippingCity,
        state: order.shippingState,
        postalCode: order.shippingPostalCode,
        country: order.shippingCountry,
      },
    };
  }

  private temporal() {
    return (globalThis as typeof globalThis & { Temporal: typeof TemporalApi })
      .Temporal;
  }
}
