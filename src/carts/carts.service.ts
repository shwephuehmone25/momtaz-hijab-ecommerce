import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { throwIfUniqueViolation } from '../common/database/database-error';
import { db } from '../database/db';
import {
  AddCartItemDto,
  CartStatus,
  CartsQueryDto,
  CreateCartDto,
  UpdateCartDto,
  UpdateCartItemDto,
} from './dto';

const cartFields = [
  'id',
  'customerId',
  'status',
  'createdAt',
  'updatedAt',
] as const;

const cartItemFields = [
  'id',
  'cartId',
  'productVariantId',
  'quantity',
  'unitPrice',
  'createdAt',
  'updatedAt',
] as const;

@Injectable()
export class CartsService {
  private cartQuery() {
    return db.orm.public.Cart.select(...cartFields).include('items', (items) =>
      items
        .select(...cartItemFields)
        .include('productVariant', (variant) =>
          variant
            .select('id', 'sku', 'color', 'style', 'size')
            .include('product', (product) => product.select('id', 'name')),
        ),
    );
  }

  async getActiveCart(customerId: number) {
    await this.requireCustomer(customerId);
    const cart = await this.cartQuery()
      .where({ customerId, status: CartStatus.ACTIVE })
      .orderBy((record) => record.createdAt.desc())
      .first();

    return cart
      ? this.serializeCart(cart)
      : {
          id: null,
          customerId,
          status: CartStatus.ACTIVE,
          items: [],
          totalQuantity: 0,
          subtotal: '0.00',
          createdAt: null,
          updatedAt: null,
        };
  }

  async addItem(customerId: number, dto: AddCartItemDto) {
    await this.requireCustomer(customerId);

    const cartId = await db.transaction(async (tx) => {
      let cart = await tx.orm.public.Cart.select('id')
        .where({ customerId, status: CartStatus.ACTIVE })
        .orderBy((record) => record.createdAt.desc())
        .first();
      cart ??= await tx.orm.public.Cart.select('id').create({
        customerId,
        status: CartStatus.ACTIVE,
      });

      const existing = await tx.orm.public.CartItem.select(
        'id',
        'quantity',
      ).first({ cartId: cart.id, productVariantId: dto.productVariantId });
      const quantity = (existing?.quantity ?? 0) + dto.quantity;
      const variant = await this.requirePurchasableVariant(
        dto.productVariantId,
        quantity,
        tx,
      );

      if (existing) {
        await tx.orm.public.CartItem.where({ id: existing.id }).update({
          quantity,
          unitPrice: variant.price,
        });
      } else {
        await tx.orm.public.CartItem.create({
          cartId: cart.id,
          productVariantId: dto.productVariantId,
          quantity,
          unitPrice: variant.price,
        });
      }
      return cart.id;
    });

    return this.findOne(cartId);
  }

  async updateCustomerItem(
    customerId: number,
    itemId: number,
    dto: UpdateCartItemDto,
  ) {
    const cart = await db.orm.public.Cart.select('id')
      .where({ customerId, status: CartStatus.ACTIVE })
      .orderBy((record) => record.createdAt.desc())
      .first();
    if (!cart) {
      throw new NotFoundException(
        `Active cart for customer ${customerId} was not found`,
      );
    }
    await this.updateItem(cart.id, itemId, dto);
    return this.findOne(cart.id);
  }

  async removeCustomerItem(customerId: number, itemId: number) {
    const cart = await db.orm.public.Cart.select('id')
      .where({ customerId, status: CartStatus.ACTIVE })
      .orderBy((record) => record.createdAt.desc())
      .first();
    if (!cart) {
      throw new NotFoundException(
        `Active cart for customer ${customerId} was not found`,
      );
    }
    await this.removeItem(cart.id, itemId);
    return this.findOne(cart.id);
  }

  async create(dto: CreateCartDto) {
    await this.requireCustomer(dto.customerId);
    const status = dto.status ?? CartStatus.ACTIVE;
    if (status === CartStatus.ACTIVE) {
      await this.ensureNoActiveCart(dto.customerId);
    }
    const cart = await db.orm.public.Cart.select(...cartFields).create({
      customerId: dto.customerId,
      status,
    });
    return this.findOne(cart.id);
  }

  async findAll(query: CartsQueryDto) {
    let carts = this.cartQuery();
    if (query.customerId !== undefined) {
      carts = carts.where({ customerId: query.customerId });
    }
    if (query.status !== undefined) {
      carts = carts.where({ status: query.status });
    }

    let countQuery = db.orm.public.Cart;
    if (query.customerId !== undefined) {
      countQuery = countQuery.where({ customerId: query.customerId });
    }
    if (query.status !== undefined) {
      countQuery = countQuery.where({ status: query.status });
    }

    const [items, totalResult] = await Promise.all([
      carts
        .orderBy([(cart) => cart.updatedAt.desc(), (cart) => cart.id.desc()])
        .limit(query.limit)
        .offset((query.page - 1) * query.limit)
        .all(),
      countQuery.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);

    return {
      items: items.map((cart) => this.serializeCart(cart)),
      page: query.page,
      limit: query.limit,
      total: totalResult.total,
    };
  }

  async findOne(id: number) {
    const cart = await this.cartQuery().first({ id });
    if (!cart) {
      throw new NotFoundException(`Cart ${id} was not found`);
    }
    return this.serializeCart(cart);
  }

  async update(id: number, dto: UpdateCartDto) {
    const current = await db.orm.public.Cart.select(...cartFields).first({
      id,
    });
    if (!current) {
      throw new NotFoundException(`Cart ${id} was not found`);
    }
    const customerId = dto.customerId ?? current.customerId;
    const status = dto.status ?? current.status;
    if (dto.customerId !== undefined) {
      await this.requireCustomer(dto.customerId);
    }
    if (status === CartStatus.ACTIVE) {
      await this.ensureNoActiveCart(customerId, id);
    }
    await db.orm.public.Cart.where({ id }).update({
      ...(dto.customerId !== undefined && { customerId: dto.customerId }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await db.orm.public.Cart.where({ id }).delete();
    return { message: `Cart ${id} deleted` };
  }

  async addAdminItem(cartId: number, dto: AddCartItemDto) {
    const cart = await db.orm.public.Cart.select('id', 'status').first({
      id: cartId,
    });
    if (!cart) throw new NotFoundException(`Cart ${cartId} was not found`);
    if (cart.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Items can only be added to an active cart',
      );
    }

    try {
      const existing = await db.orm.public.CartItem.select(
        'id',
        'quantity',
      ).first({
        cartId,
        productVariantId: dto.productVariantId,
      });
      const quantity = (existing?.quantity ?? 0) + dto.quantity;
      const variant = await this.requirePurchasableVariant(
        dto.productVariantId,
        quantity,
        db,
      );
      if (existing) {
        await db.orm.public.CartItem.where({ id: existing.id }).update({
          quantity,
          unitPrice: variant.price,
        });
      } else {
        await db.orm.public.CartItem.create({
          cartId,
          productVariantId: dto.productVariantId,
          quantity,
          unitPrice: variant.price,
        });
      }
    } catch (error) {
      throwIfUniqueViolation(
        error,
        'This product variant is already in the cart',
      );
    }
    return this.findOne(cartId);
  }

  async updateItem(cartId: number, itemId: number, dto: UpdateCartItemDto) {
    const item = await db.orm.public.CartItem.select(
      'id',
      'productVariantId',
    ).first({
      id: itemId,
      cartId,
    });
    if (!item) {
      throw new NotFoundException(
        `Cart item ${itemId} was not found in cart ${cartId}`,
      );
    }
    const variant = await this.requirePurchasableVariant(
      item.productVariantId,
      dto.quantity,
      db,
    );
    await db.orm.public.CartItem.where({ id: itemId, cartId }).update({
      quantity: dto.quantity,
      unitPrice: variant.price,
    });
    return this.findOne(cartId);
  }

  async removeItem(cartId: number, itemId: number) {
    const item = await db.orm.public.CartItem.select('id').first({
      id: itemId,
      cartId,
    });
    if (!item) {
      throw new NotFoundException(
        `Cart item ${itemId} was not found in cart ${cartId}`,
      );
    }
    await db.orm.public.CartItem.where({ id: itemId, cartId }).delete();
    return { message: `Cart item ${itemId} deleted` };
  }

  private async requireCustomer(customerId: number) {
    const customer = await db.orm.public.Customer.select('id').first({
      id: customerId,
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} was not found`);
    }
  }

  private async ensureNoActiveCart(customerId: number, exceptId?: number) {
    const query = db.orm.public.Cart.select('id').where({
      customerId,
      status: CartStatus.ACTIVE,
    });
    const active = await query.first();
    if (active && active.id !== exceptId) {
      throw new ConflictException(
        `Customer ${customerId} already has an active cart`,
      );
    }
  }

  private async requirePurchasableVariant(
    id: number,
    quantity: number,
    database: { orm: typeof db.orm },
  ) {
    const variant = await database.orm.public.ProductVariant.select(
      'id',
      'price',
      'status',
    )
      .include('product', (product) => product.select('status'))
      .include('inventory', (inventory) =>
        inventory.select('quantity', 'reservedQuantity'),
      )
      .first({ id });
    if (!variant) {
      throw new NotFoundException(`Product variant ${id} was not found`);
    }
    if (variant.status !== 'ACTIVE' || variant.product?.status !== 'ACTIVE') {
      throw new BadRequestException(`Product variant ${id} is not available`);
    }
    const available = variant.inventory
      ? variant.inventory.quantity - variant.inventory.reservedQuantity
      : 0;
    if (quantity > available) {
      throw new BadRequestException(
        `Only ${available} units of product variant ${id} are available`,
      );
    }
    return variant;
  }

  private serializeCart<
    T extends { items: Array<{ quantity: number; unitPrice: unknown }> },
  >(cart: T) {
    let subtotalCents = 0n;
    const items = cart.items.map((item) => {
      const unitPrice = String(item.unitPrice);
      const lineTotalCents = this.toCents(unitPrice) * BigInt(item.quantity);
      subtotalCents += lineTotalCents;
      return {
        ...item,
        unitPrice,
        lineTotal: this.fromCents(lineTotalCents),
      };
    });
    return {
      ...cart,
      items,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: this.fromCents(subtotalCents),
    };
  }

  private toCents(value: string) {
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
  }

  private fromCents(value: bigint) {
    return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
  }
}
