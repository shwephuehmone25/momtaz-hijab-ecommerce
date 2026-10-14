import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '../database/db';
import { numeric } from '../common/database/numeric';
import { varchar } from '../common/database/varchar';
import {
  AdminCreateOrderDto,
  AdminUpdateOrderDto,
  CreateOrderDto,
  OrderAddressDto,
  OrderItemInputDto,
  OrdersQueryDto,
  OrderStatus,
  UpdateOrderDto,
} from './dto';

const orderFields = [
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
  'billingName',
  'billingPhone',
  'billingAddressLine1',
  'billingAddressLine2',
  'billingCity',
  'billingState',
  'billingPostalCode',
  'billingCountry',
  'subtotal',
  'shippingFee',
  'discountAmount',
  'total',
  'createdAt',
  'updatedAt',
] as const;

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [OrderStatus.REFUNDED],
  CANCELLED: [],
  REFUNDED: [],
};

type Database = { orm: typeof db.orm };
type SerializableOrder = {
  subtotal: unknown;
  shippingFee: unknown;
  discountAmount: unknown;
  total: unknown;
  items: Array<
    Record<string, unknown> & { unitPrice: unknown; totalPrice: unknown }
  >;
  payments: Array<Record<string, unknown> & { amount: unknown }>;
};

@Injectable()
export class OrdersService {
  private orderQuery(database: Database = db) {
    return database.orm.public.Order.select(...orderFields)
      .include('items', (items) =>
        items
          .select(
            'id',
            'variantId',
            'productName',
            'sku',
            'quantity',
            'unitPrice',
            'totalPrice',
            'createdAt',
          )
          .orderBy((item) => item.id.asc()),
      )
      .include('payments', (payments) =>
        payments
          .select('id', 'paymentMethod', 'status', 'amount', 'createdAt')
          .orderBy([
            (payment) => payment.createdAt.desc(),
            (payment) => payment.id.desc(),
          ]),
      )
      .include('shipments', (shipments) =>
        shipments
          .select('id', 'status', 'carrier', 'trackingNumber', 'createdAt')
          .orderBy((shipment) => shipment.id.asc()),
      );
  }

  createForCustomer(customerId: number, dto: CreateOrderDto) {
    return this.create(customerId, dto, '0.00');
  }

  createForAdmin(dto: AdminCreateOrderDto) {
    return this.create(dto.customerId, dto, dto.shippingFee ?? '0.00');
  }

  private async create(
    customerId: number,
    dto: CreateOrderDto,
    shippingFee: string,
  ) {
    const normalizedItems = this.normalizeItems(dto.items);
    const shippingFeeCents = this.parseMoney(shippingFee, 'shippingFee');
    const orderId = await db.transaction(async (tx) => {
      await this.requireCustomer(customerId, tx);
      const pricedItems = await this.priceAndReserveItems(
        normalizedItems,
        new Map(),
        tx,
      );
      const subtotalCents = pricedItems.reduce(
        (sum, item) => sum + item.totalCents,
        0n,
      );
      const order = await tx.orm.public.Order.select('id').create({
        customerId,
        status: OrderStatus.PENDING,
        ...this.createAddressData(dto.shippingAddress, dto.billingAddress),
        subtotal: numeric<10, 2>(this.fromCents(subtotalCents)),
        shippingFee: numeric<10, 2>(this.fromCents(shippingFeeCents)),
        discountAmount: numeric<10, 2>('0.00'),
        total: numeric<10, 2>(this.fromCents(subtotalCents + shippingFeeCents)),
      });
      for (const item of pricedItems) {
        await tx.orm.public.OrderItem.create({
          orderId: order.id,
          variantId: item.variantId,
          productName: varchar<150>(item.productName),
          sku: varchar<50>(item.sku),
          quantity: item.quantity,
          unitPrice: numeric<10, 2>(item.unitPrice),
          totalPrice: numeric<10, 2>(this.fromCents(item.totalCents)),
        });
      }
      return order.id;
    });
    return this.findOne(orderId);
  }

  async findAll(query: OrdersQueryDto, customerId?: number) {
    let orders = db.orm.public.Order.select(
      'id',
      'customerId',
      'status',
      'total',
      'createdAt',
    );
    let count = db.orm.public.Order;
    const scopedCustomerId = customerId ?? query.customerId;
    if (scopedCustomerId !== undefined) {
      orders = orders.where({ customerId: scopedCustomerId });
      count = count.where({ customerId: scopedCustomerId });
    }
    if (query.status !== undefined) {
      orders = orders.where({ status: query.status });
      count = count.where({ status: query.status });
    }
    const [rows, totalResult] = await Promise.all([
      orders
        .orderBy([
          (order) => order.createdAt.desc(),
          (order) => order.id.desc(),
        ])
        .limit(query.limit)
        .offset((query.page - 1) * query.limit)
        .all(),
      count.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);
    const paymentStatusByOrder = await this.latestPaymentStatuses(
      rows.map((order) => order.id),
    );
    return {
      items: rows.map((order) => ({
        id: order.id,
        order_key: String(order.id),
        customer_id: order.customerId,
        order_status: order.status,
        payment_status: paymentStatusByOrder.get(order.id) ?? 'PENDING',
        order_total: Number(order.total),
        created_at: String(order.createdAt),
      })),
      pagination: {
        page: query.page,
        pageSize: query.limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / query.limit),
      },
    };
  }

  async findOne(id: number, customerId?: number) {
    const order = await this.orderQuery().first({ id });
    if (
      !order ||
      (customerId !== undefined && order.customerId !== customerId)
    ) {
      throw new NotFoundException(`Order ${id} was not found`);
    }
    return this.serializeOrder(order);
  }

  updateForCustomer(customerId: number, id: number, dto: UpdateOrderDto) {
    return this.update(id, dto, customerId);
  }

  updateForAdmin(id: number, dto: AdminUpdateOrderDto) {
    return this.update(id, dto);
  }

  private async update(
    id: number,
    dto: AdminUpdateOrderDto,
    customerId?: number,
  ) {
    await db.transaction(async (tx) => {
      const current = await tx.orm.public.Order.select(
        'id',
        'customerId',
        'status',
        'subtotal',
        'shippingFee',
        'discountAmount',
      )
        .include('items', (items) =>
          items.select('id', 'variantId', 'quantity'),
        )
        .first({ id });
      if (
        !current ||
        (customerId !== undefined && current.customerId !== customerId)
      ) {
        throw new NotFoundException(`Order ${id} was not found`);
      }
      const contentChanged = Boolean(
        dto.shippingAddress ||
        dto.billingAddress ||
        dto.items ||
        dto.shippingFee !== undefined,
      );
      const currentStatus = current.status as OrderStatus;
      if (contentChanged && currentStatus !== OrderStatus.PENDING) {
        throw new ConflictException('Only pending orders can be edited');
      }
      if (customerId !== undefined && dto.status !== undefined) {
        throw new BadRequestException('Customers cannot change order status');
      }
      if (contentChanged && dto.status !== undefined) {
        throw new BadRequestException(
          'Order content and status must be updated in separate requests',
        );
      }

      const updateData: Record<string, unknown> = {};
      if (dto.shippingAddress)
        Object.assign(
          updateData,
          this.addressData('shipping', dto.shippingAddress),
        );
      if (dto.billingAddress)
        Object.assign(
          updateData,
          this.addressData('billing', dto.billingAddress),
        );

      let subtotalCents = this.toCents(String(current.subtotal));
      if (dto.items) {
        const previous = new Map(
          current.items.map((item) => [item.variantId, item.quantity]),
        );
        const pricedItems = await this.priceAndReserveItems(
          this.normalizeItems(dto.items),
          previous,
          tx,
        );
        const nextVariantIds = new Set(
          pricedItems.map((item) => item.variantId),
        );
        for (const [variantId, quantity] of previous) {
          if (!nextVariantIds.has(variantId))
            await this.changeReservation(variantId, -quantity, tx);
        }
        await tx.orm.public.OrderItem.where({ orderId: id }).delete();
        for (const item of pricedItems) {
          await tx.orm.public.OrderItem.create({
            orderId: id,
            variantId: item.variantId,
            productName: varchar<150>(item.productName),
            sku: varchar<50>(item.sku),
            quantity: item.quantity,
            unitPrice: numeric<10, 2>(item.unitPrice),
            totalPrice: numeric<10, 2>(this.fromCents(item.totalCents)),
          });
        }
        subtotalCents = pricedItems.reduce(
          (sum, item) => sum + item.totalCents,
          0n,
        );
        updateData.subtotal = this.fromCents(subtotalCents);
      }

      const shippingFeeCents =
        dto.shippingFee === undefined
          ? this.toCents(String(current.shippingFee))
          : this.parseMoney(dto.shippingFee, 'shippingFee');
      if (dto.shippingFee !== undefined)
        updateData.shippingFee = this.fromCents(shippingFeeCents);
      if (dto.items || dto.shippingFee !== undefined) {
        const discount = this.toCents(String(current.discountAmount));
        updateData.total = this.fromCents(
          subtotalCents + shippingFeeCents - discount,
        );
      }

      if (dto.status !== undefined && dto.status !== currentStatus) {
        this.assertTransition(currentStatus, dto.status);
        if (dto.status === OrderStatus.CANCELLED) {
          await this.releaseOrderReservations(current.items, tx);
        }
        updateData.status = dto.status;
      }
      if (Object.keys(updateData).length > 0) {
        const updated = await tx.orm.public.Order.where({
          id,
          status: currentStatus,
        })
          .select('id')
          .update(updateData);
        if (!updated) {
          throw new ConflictException('Order changed; retry the request');
        }
      }
    });
    return this.findOne(id, customerId);
  }

  async cancelForCustomer(customerId: number, id: number) {
    await db.transaction(async (tx) => {
      const order = await tx.orm.public.Order.select(
        'id',
        'customerId',
        'status',
      )
        .include('items', (items) => items.select('variantId', 'quantity'))
        .first({ id });
      if (!order || order.customerId !== customerId) {
        throw new NotFoundException(`Order ${id} was not found`);
      }
      const currentStatus = order.status as OrderStatus;
      if (
        ![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(currentStatus)
      ) {
        throw new ConflictException(
          'Only pending or confirmed orders can be cancelled',
        );
      }
      await this.releaseOrderReservations(order.items, tx);
      const updated = await tx.orm.public.Order.where({
        id,
        status: currentStatus,
      })
        .select('id')
        .update({ status: OrderStatus.CANCELLED });
      if (!updated) {
        throw new ConflictException('Order changed; retry the request');
      }
    });
    return this.findOne(id, customerId);
  }

  async removeByAdmin(id: number) {
    await db.transaction(async (tx) => {
      const order = await tx.orm.public.Order.select('id', 'status').first({
        id,
      });
      if (!order) throw new NotFoundException(`Order ${id} was not found`);
      if (
        ![OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(
          order.status as OrderStatus,
        )
      ) {
        throw new ConflictException(
          'Only cancelled or refunded orders can be deleted',
        );
      }
      await tx.orm.public.Order.where({ id }).delete();
    });
    return { message: `Order ${id} deleted` };
  }

  private async latestPaymentStatuses(orderIds: number[]) {
    if (orderIds.length === 0) return new Map<number, string>();
    const payments = await db.orm.public.Payment.select(
      'orderId',
      'status',
      'createdAt',
      'id',
    )
      .where((payment) => payment.orderId.in(orderIds))
      .orderBy([
        (payment) => payment.createdAt.desc(),
        (payment) => payment.id.desc(),
      ])
      .all();
    const result = new Map<number, string>();
    for (const payment of payments) {
      if (!result.has(payment.orderId))
        result.set(payment.orderId, payment.status);
    }
    return result;
  }

  private async requireCustomer(customerId: number, database: Database) {
    const customer = await database.orm.public.Customer.select('id').first({
      id: customerId,
    });
    if (!customer)
      throw new NotFoundException(`Customer ${customerId} was not found`);
  }

  normalizeItems(items: OrderItemInputDto[]) {
    const quantities = new Map<number, number>();
    for (const item of items) {
      quantities.set(
        item.variantId,
        (quantities.get(item.variantId) ?? 0) + item.quantity,
      );
    }
    return [...quantities].map(([variantId, quantity]) => ({
      variantId,
      quantity,
    }));
  }

  private async priceAndReserveItems(
    items: OrderItemInputDto[],
    previous: Map<number, number>,
    database: Database,
  ) {
    const priced: Array<{
      variantId: number;
      quantity: number;
      productName: string;
      sku: string;
      unitPrice: string;
      totalCents: bigint;
    }> = [];
    for (const item of items) {
      const variant = await database.orm.public.ProductVariant.select(
        'id',
        'sku',
        'price',
        'status',
      )
        .include('product', (product) => product.select('name', 'status'))
        .include('inventory', (inventory) =>
          inventory.select('quantity', 'reservedQuantity'),
        )
        .first({ id: item.variantId });
      if (!variant)
        throw new NotFoundException(
          `Product variant ${item.variantId} was not found`,
        );
      if (variant.status !== 'ACTIVE' || variant.product?.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Product variant ${item.variantId} is not available`,
        );
      }
      if (!variant.inventory) {
        throw new ConflictException(
          `Inventory for product variant ${item.variantId} was not found`,
        );
      }
      const oldQuantity = previous.get(item.variantId) ?? 0;
      const availableForOrder =
        variant.inventory.quantity -
        variant.inventory.reservedQuantity +
        oldQuantity;
      if (item.quantity > availableForOrder) {
        throw new ConflictException(
          `Only ${availableForOrder} units of product variant ${item.variantId} are available`,
        );
      }
      await this.changeReservation(
        item.variantId,
        item.quantity - oldQuantity,
        database,
        variant.inventory,
      );
      const unitPrice = String(variant.price);
      priced.push({
        variantId: item.variantId,
        quantity: item.quantity,
        productName: variant.product.name,
        sku: variant.sku,
        unitPrice,
        totalCents: this.toCents(unitPrice) * BigInt(item.quantity),
      });
    }
    return priced;
  }

  private async changeReservation(
    variantId: number,
    delta: number,
    database: Database,
    known?: { quantity: number; reservedQuantity: number },
  ) {
    if (delta === 0) return;
    const inventory =
      known ??
      (await database.orm.public.Inventory.select(
        'quantity',
        'reservedQuantity',
      ).first({ variantId }));
    if (!inventory)
      throw new ConflictException(
        `Inventory for product variant ${variantId} was not found`,
      );
    const reservedQuantity = inventory.reservedQuantity + delta;
    if (reservedQuantity < 0 || reservedQuantity > inventory.quantity) {
      throw new ConflictException(
        `Inventory for product variant ${variantId} changed; retry the request`,
      );
    }
    const updated = await database.orm.public.Inventory.where({
      variantId,
      reservedQuantity: inventory.reservedQuantity,
    })
      .select('id')
      .update({ reservedQuantity });
    if (!updated) {
      throw new ConflictException(
        `Inventory for product variant ${variantId} changed; retry the request`,
      );
    }
  }

  private async releaseOrderReservations(
    items: Array<{ variantId: number; quantity: number }>,
    database: Database,
  ) {
    for (const item of items)
      await this.changeReservation(item.variantId, -item.quantity, database);
  }

  assertTransition(from: OrderStatus, to: OrderStatus) {
    if (!transitions[from].includes(to)) {
      throw new ConflictException(
        `Order status cannot transition from ${from} to ${to}`,
      );
    }
  }

  private addressData(
    prefix: 'shipping' | 'billing',
    address: OrderAddressDto,
  ) {
    const cap = (name: string) =>
      `${prefix}${name[0].toUpperCase()}${name.slice(1)}`;
    return {
      [cap('name')]: address.name,
      [cap('phone')]: address.phone,
      [cap('addressLine1')]: address.addressLine1,
      [cap('addressLine2')]: address.addressLine2 ?? null,
      [cap('city')]: address.city,
      [cap('state')]: address.state ?? null,
      [cap('postalCode')]: address.postalCode ?? null,
      [cap('country')]: address.country,
    };
  }

  private createAddressData(
    shipping: OrderAddressDto,
    billing: OrderAddressDto,
  ) {
    return {
      shippingName: varchar<100>(shipping.name),
      shippingPhone: varchar<20>(shipping.phone),
      shippingAddressLine1: varchar<255>(shipping.addressLine1),
      shippingAddressLine2: shipping.addressLine2
        ? varchar<255>(shipping.addressLine2)
        : null,
      shippingCity: varchar<100>(shipping.city),
      shippingState: shipping.state ? varchar<100>(shipping.state) : null,
      shippingPostalCode: shipping.postalCode
        ? varchar<20>(shipping.postalCode)
        : null,
      shippingCountry: varchar<100>(shipping.country),
      billingName: varchar<100>(billing.name),
      billingPhone: varchar<20>(billing.phone),
      billingAddressLine1: varchar<255>(billing.addressLine1),
      billingAddressLine2: billing.addressLine2
        ? varchar<255>(billing.addressLine2)
        : null,
      billingCity: varchar<100>(billing.city),
      billingState: billing.state ? varchar<100>(billing.state) : null,
      billingPostalCode: billing.postalCode
        ? varchar<20>(billing.postalCode)
        : null,
      billingCountry: varchar<100>(billing.country),
    };
  }

  private serializeOrder<T extends SerializableOrder>(order: T) {
    return {
      ...order,
      subtotal: String(order.subtotal),
      shippingFee: String(order.shippingFee),
      discountAmount: String(order.discountAmount),
      total: String(order.total),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: String(item.unitPrice),
        totalPrice: String(item.totalPrice),
      })),
      payments: order.payments.map((payment) => ({
        ...payment,
        amount: String(payment.amount),
      })),
    };
  }

  parseMoney(value: string, field: string) {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
      throw new BadRequestException(
        `${field} must be a non-negative amount with at most two decimals`,
      );
    }
    return this.toCents(value);
  }

  toCents(value: string) {
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
  }

  fromCents(value: bigint) {
    if (value < 0n)
      throw new BadRequestException('Order total cannot be negative');
    return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
  }
}
