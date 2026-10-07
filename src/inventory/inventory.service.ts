import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { throwIfUniqueViolation } from '../common/database/database-error';
import { db } from '../database/db';
import {
  CreateInventoryDto,
  InventoryQueryDto,
  UpdateInventoryDto,
} from './dto';

const inventoryFields = [
  'id',
  'variantId',
  'quantity',
  'reservedQuantity',
  'updatedAt',
] as const;

type InventoryRow = {
  id: number;
  variantId: number;
  quantity: number;
  reservedQuantity: number;
  updatedAt: unknown;
};

@Injectable()
export class InventoryService {
  async create(dto: CreateInventoryDto) {
    await this.requireVariant(dto.variantId);
    const quantity = dto.quantity ?? 0;
    const reservedQuantity = dto.reservedQuantity ?? 0;
    this.validateStock(quantity, reservedQuantity);

    try {
      const inventory = await db.orm.public.Inventory.select(
        ...inventoryFields,
      ).create({ variantId: dto.variantId, quantity, reservedQuantity });
      return this.serialize(inventory);
    } catch (error) {
      throwIfUniqueViolation(
        error,
        `Inventory already exists for product variant ${dto.variantId}`,
      );
    }
  }

  async findAll(query: InventoryQueryDto) {
    let inventory = db.orm.public.Inventory.select(...inventoryFields);
    if (query.variantId !== undefined) {
      inventory = inventory.where({ variantId: query.variantId });
    }

    const [rows, totalResult] = await Promise.all([
      inventory
        .orderBy([(item) => item.updatedAt.desc(), (item) => item.id.desc()])
        .limit(query.limit)
        .offset((query.page - 1) * query.limit)
        .all(),
      inventory.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);

    return {
      items: rows.map((row) => this.serialize(row)),
      page: query.page,
      limit: query.limit,
      total: totalResult.total,
    };
  }

  async findOne(id: number) {
    const inventory = await db.orm.public.Inventory.select(
      ...inventoryFields,
    ).first({ id });

    if (!inventory) {
      throw new NotFoundException(`Inventory ${id} was not found`);
    }

    return this.serialize(inventory);
  }

  async update(id: number, dto: UpdateInventoryDto) {
    const current = await db.orm.public.Inventory.select(
      ...inventoryFields,
    ).first({ id });
    if (!current) {
      throw new NotFoundException(`Inventory ${id} was not found`);
    }

    const quantity = dto.quantity ?? current.quantity;
    const reservedQuantity = dto.reservedQuantity ?? current.reservedQuantity;
    this.validateStock(quantity, reservedQuantity);

    const updated = await db.orm.public.Inventory.where({ id })
      .select(...inventoryFields)
      .update({
        ...(dto.quantity !== undefined && { quantity }),
        ...(dto.reservedQuantity !== undefined && { reservedQuantity }),
      });
    if (!updated) {
      throw new NotFoundException(`Inventory ${id} was not found`);
    }
    return this.serialize(updated);
  }

  async remove(id: number) {
    await this.findOne(id);
    await db.orm.public.Inventory.where({ id }).delete();
    return { message: `Inventory ${id} deleted` };
  }

  private async requireVariant(id: number) {
    const variant = await db.orm.public.ProductVariant.select('id').first({
      id,
    });
    if (!variant) {
      throw new NotFoundException(`Product variant ${id} was not found`);
    }
  }

  private validateStock(quantity: number, reservedQuantity: number) {
    if (reservedQuantity > quantity) {
      throw new BadRequestException('reservedQuantity cannot exceed quantity');
    }
  }

  private serialize<T extends InventoryRow>(inventory: T) {
    return {
      ...inventory,
      availableQuantity: inventory.quantity - inventory.reservedQuantity,
    };
  }
}
