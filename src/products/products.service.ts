import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { throwIfUniqueViolation } from '../common/database/database-error';
import { numeric } from '../common/database/numeric';
import { varchar } from '../common/database/varchar';
import { db } from '../database/db';
import {
  CreateProductDto,
  ProductVariantInputDto,
  ProductStatus,
  ProductsQueryDto,
  UpdateProductDto,
  UpdateProductVariantInputDto,
} from './dto';

const productFields = [
  'id',
  'categoryId',
  'name',
  'description',
  'status',
  'createdAt',
  'updatedAt',
] as const;

const variantFields = [
  'id',
  'productId',
  'sku',
  'color',
  'style',
  'size',
  'price',
  'compareAtPrice',
  'status',
  'createdAt',
  'updatedAt',
] as const;

const inventoryFields = [
  'id',
  'variantId',
  'quantity',
  'reservedQuantity',
  'updatedAt',
] as const;

@Injectable()
export class ProductsService {
  async create(dto: CreateProductDto) {
    this.requireUniquePayloadSkus(dto.variants ?? []);

    try {
      return await db.transaction(async (tx) => {
        await this.requireCategory(dto.categoryId, tx.orm.public.Category);

        const product = await tx.orm.public.Product.select(
          ...productFields,
        ).create({
          categoryId: dto.categoryId,
          name: varchar<150>(dto.name.trim()),
          description: this.optionalText(dto.description),
          status: dto.status ?? 'ACTIVE',
        });

        for (const variantDto of dto.variants ?? []) {
          const variant = await tx.orm.public.ProductVariant.create({
            productId: product.id,
            ...this.variantCreateData(variantDto),
          });
          await tx.orm.public.Inventory.create({
            variantId: variant.id,
            quantity: variantDto.quantity ?? 0,
            reservedQuantity: variantDto.reservedQuantity ?? 0,
          });
        }

        return this.findProductInTransaction(tx.orm.public.Product, product.id);
      });
    } catch (error) {
      throwIfUniqueViolation(
        error,
        'A product variant with this SKU already exists',
      );
    }
  }

  async findAll(query: ProductsQueryDto) {
    const search = query.search?.trim();
    let products = db.orm.public.Product.select(...productFields);

    if (search) {
      products = products.where((product) => product.name.ilike(`%${search}%`));
    }
    if (query.categoryId !== undefined) {
      products = products.where({ categoryId: query.categoryId });
    }
    if (query.status !== undefined) {
      products = products.where({ status: query.status });
    }

    const [items, totalResult] = await Promise.all([
      products
        .orderBy([
          (product) => product.createdAt.desc(),
          (product) => product.id.desc(),
        ])
        .limit(query.limit)
        .offset((query.page - 1) * query.limit)
        .all(),
      products.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total: totalResult.total,
    };
  }

  async findOne(id: number) {
    const product = await this.findProductInTransaction(
      db.orm.public.Product,
      id,
    );

    if (!product) {
      throw new NotFoundException(`Product ${id} was not found`);
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    try {
      return await db.transaction(async (tx) => {
        const current = await tx.orm.public.Product.select('id').first({ id });
        if (!current) {
          throw new NotFoundException(`Product ${id} was not found`);
        }
        if (dto.categoryId !== undefined) {
          await this.requireCategory(dto.categoryId, tx.orm.public.Category);
        }

        const changes = {
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.name !== undefined && {
            name: varchar<150>(dto.name.trim()),
          }),
          ...(dto.description !== undefined && {
            description: this.optionalText(dto.description),
          }),
          ...(dto.status !== undefined && { status: dto.status }),
        };
        if (Object.keys(changes).length > 0) {
          await tx.orm.public.Product.where({ id }).update(changes);
        }

        if (dto.variants !== undefined) {
          const existing = await tx.orm.public.ProductVariant.select(
            ...variantFields,
          )
            .include('inventory', (inventory) =>
              inventory.select(...inventoryFields),
            )
            .where({ productId: id })
            .all();
          await this.synchronizeVariants(
            tx.orm.public,
            id,
            existing,
            dto.variants,
          );
        }

        return this.findProductInTransaction(tx.orm.public.Product, id);
      });
    } catch (error) {
      if ((error as { sqlState?: string }).sqlState === '23503') {
        throw new ConflictException(
          'A removed variant is still referenced by a cart or order',
        );
      }
      throwIfUniqueViolation(
        error,
        'A product variant with this SKU already exists',
      );
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    await db.orm.public.Product.where({ id }).delete();
    return { message: `Product ${id} deleted` };
  }

  private async requireCategory(
    id: number,
    categories = db.orm.public.Category,
  ) {
    const category = await categories.select('id').first({ id });
    if (!category) {
      throw new NotFoundException(`Category ${id} was not found`);
    }
  }

  private optionalText(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private optionalVarchar(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? varchar<50>(trimmed) : null;
  }

  private variantCreateData(dto: ProductVariantInputDto) {
    const quantity = dto.quantity ?? 0;
    const reservedQuantity = dto.reservedQuantity ?? 0;
    this.validateStock(quantity, reservedQuantity);

    return {
      sku: varchar<50>(this.normalizedSku(dto.sku)),
      color: this.optionalVarchar(dto.color),
      style: this.optionalVarchar(dto.style),
      size: this.optionalVarchar(dto.size),
      price: numeric<10, 2>(dto.price),
      compareAtPrice:
        dto.compareAtPrice === undefined || dto.compareAtPrice === null
          ? null
          : numeric<10, 2>(dto.compareAtPrice),
      status: dto.status ?? ProductStatus.ACTIVE,
    };
  }

  private async synchronizeVariants(
    models: typeof db.orm.public,
    productId: number,
    existing: Array<{
      id: number;
      sku: string;
      color: string | null;
      style: string | null;
      size: string | null;
      price: string;
      compareAtPrice: string | null;
      status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
      inventory: {
        id: number;
        quantity: number;
        reservedQuantity: number;
      } | null;
    }>,
    requested: UpdateProductVariantInputDto[],
  ) {
    const existingById = new Map(
      existing.map((variant) => [variant.id, variant]),
    );
    const requestedIds = requested
      .map((variant) => variant.id)
      .filter((variantId): variantId is number => variantId !== undefined);
    if (new Set(requestedIds).size !== requestedIds.length) {
      throw new BadRequestException('Variant IDs must be unique');
    }
    for (const variantId of requestedIds) {
      if (!existingById.has(variantId)) {
        throw new BadRequestException(
          `Product variant ${variantId} does not belong to product ${productId}`,
        );
      }
    }

    const resolvedSkus = requested.map((variant) => {
      const current = variant.id ? existingById.get(variant.id) : undefined;
      if (!current && (!variant.sku || variant.price === undefined)) {
        throw new BadRequestException(
          'New variants require both sku and price',
        );
      }
      return this.normalizedSku(variant.sku ?? current!.sku);
    });
    this.requireUniqueSkus(resolvedSkus);

    const retainedIds = new Set(requestedIds);
    for (const current of existing) {
      if (!retainedIds.has(current.id)) {
        await models.ProductVariant.where({ id: current.id }).delete();
      }
    }

    for (const variantDto of requested) {
      const current = variantDto.id
        ? existingById.get(variantDto.id)!
        : undefined;
      if (!current) {
        const variant = await models.ProductVariant.create({
          productId,
          ...this.variantCreateData(variantDto as ProductVariantInputDto),
        });
        await models.Inventory.create({
          variantId: variant.id,
          quantity: variantDto.quantity ?? 0,
          reservedQuantity: variantDto.reservedQuantity ?? 0,
        });
        continue;
      }

      const quantity = variantDto.quantity ?? current.inventory?.quantity ?? 0;
      const reservedQuantity =
        variantDto.reservedQuantity ?? current.inventory?.reservedQuantity ?? 0;
      this.validateStock(quantity, reservedQuantity);

      const variantChanges = {
        ...(variantDto.sku !== undefined && {
          sku: varchar<50>(this.normalizedSku(variantDto.sku)),
        }),
        ...(variantDto.color !== undefined && {
          color: this.optionalVarchar(variantDto.color),
        }),
        ...(variantDto.style !== undefined && {
          style: this.optionalVarchar(variantDto.style),
        }),
        ...(variantDto.size !== undefined && {
          size: this.optionalVarchar(variantDto.size),
        }),
        ...(variantDto.price !== undefined && {
          price: numeric<10, 2>(variantDto.price),
        }),
        ...(variantDto.compareAtPrice !== undefined && {
          compareAtPrice:
            variantDto.compareAtPrice === null
              ? null
              : numeric<10, 2>(variantDto.compareAtPrice),
        }),
        ...(variantDto.status !== undefined && { status: variantDto.status }),
      };
      if (Object.keys(variantChanges).length > 0) {
        await models.ProductVariant.where({ id: current.id }).update(
          variantChanges,
        );
      }

      if (
        variantDto.quantity !== undefined ||
        variantDto.reservedQuantity !== undefined
      ) {
        if (current.inventory) {
          await models.Inventory.where({ id: current.inventory.id }).update({
            quantity,
            reservedQuantity,
          });
        } else {
          await models.Inventory.create({
            variantId: current.id,
            quantity,
            reservedQuantity,
          });
        }
      }
    }
  }

  private findProductInTransaction(
    products: typeof db.orm.public.Product,
    id: number,
  ) {
    return products
      .select(...productFields)
      .include('variants', (variants) =>
        variants
          .select(...variantFields)
          .include('inventory', (inventory) =>
            inventory.select(...inventoryFields),
          )
          .orderBy((variant) => variant.id.asc()),
      )
      .include('images', (images) =>
        images
          .select('id', 'productId', 'imageUrl', 'sortOrder', 'createdAt')
          .orderBy((image) => image.sortOrder.asc()),
      )
      .first({ id });
  }

  private requireUniquePayloadSkus(variants: ProductVariantInputDto[]) {
    this.requireUniqueSkus(
      variants.map((variant) => this.normalizedSku(variant.sku)),
    );
    for (const variant of variants) {
      this.validateStock(variant.quantity ?? 0, variant.reservedQuantity ?? 0);
    }
  }

  private requireUniqueSkus(skus: string[]) {
    if (new Set(skus).size !== skus.length) {
      throw new ConflictException('Variant SKUs must be unique');
    }
  }

  private normalizedSku(sku: string) {
    const normalized = sku.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Variant SKU cannot be blank');
    }
    return normalized;
  }

  private validateStock(quantity: number, reservedQuantity: number) {
    if (reservedQuantity > quantity) {
      throw new BadRequestException('reservedQuantity cannot exceed quantity');
    }
  }
}
