import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { throwIfUniqueViolation } from '../common/database/database-error';
import { numeric } from '../common/database/numeric';
import { varchar } from '../common/database/varchar';
import { db } from '../database/db';
import {
  CreateProductVariantDto,
  ProductVariantsQueryDto,
  UpdateProductVariantDto,
} from './dto';

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

@Injectable()
export class ProductVariantsService {
  async create(dto: CreateProductVariantDto) {
    await this.requireProduct(dto.productId);

    try {
      return await db.orm.public.ProductVariant.select(...variantFields).create(
        {
          productId: dto.productId,
          sku: varchar<50>(dto.sku.trim().toUpperCase()),
          color: this.optionalVarchar(dto.color),
          style: this.optionalVarchar(dto.style),
          size: this.optionalVarchar(dto.size),
          price: numeric<10, 2>(dto.price),
          compareAtPrice:
            dto.compareAtPrice === undefined || dto.compareAtPrice === null
              ? null
              : numeric<10, 2>(dto.compareAtPrice),
          status: dto.status ?? 'ACTIVE',
        },
      );
    } catch (error) {
      throwIfUniqueViolation(
        error,
        'A product variant with this SKU already exists',
      );
    }
  }

  async findAll(query: ProductVariantsQueryDto) {
    const sku = query.sku?.trim();
    let variants = db.orm.public.ProductVariant.select(...variantFields);

    if (query.productId !== undefined) {
      variants = variants.where({ productId: query.productId });
    }
    if (sku) {
      variants = variants.where((variant) => variant.sku.ilike(`%${sku}%`));
    }
    if (query.status !== undefined) {
      variants = variants.where({ status: query.status });
    }

    const [items, totalResult] = await Promise.all([
      variants
        .orderBy([
          (variant) => variant.createdAt.desc(),
          (variant) => variant.id.desc(),
        ])
        .limit(query.limit)
        .offset((query.page - 1) * query.limit)
        .all(),
      variants.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total: totalResult.total,
    };
  }

  async findOne(id: number) {
    const variant = await db.orm.public.ProductVariant.select(
      ...variantFields,
    ).first({ id });

    if (!variant) {
      throw new NotFoundException(`Product variant ${id} was not found`);
    }

    return variant;
  }

  async update(id: number, dto: UpdateProductVariantDto) {
    await this.findOne(id);
    if (dto.productId !== undefined) {
      await this.requireProduct(dto.productId);
    }

    const changes = {
      ...(dto.productId !== undefined && { productId: dto.productId }),
      ...(dto.sku !== undefined && {
        sku: varchar<50>(dto.sku.trim().toUpperCase()),
      }),
      ...(dto.color !== undefined && {
        color: this.optionalVarchar(dto.color),
      }),
      ...(dto.style !== undefined && {
        style: this.optionalVarchar(dto.style),
      }),
      ...(dto.size !== undefined && { size: this.optionalVarchar(dto.size) }),
      ...(dto.price !== undefined && { price: numeric<10, 2>(dto.price) }),
      ...(dto.compareAtPrice !== undefined && {
        compareAtPrice:
          dto.compareAtPrice === null
            ? null
            : numeric<10, 2>(dto.compareAtPrice),
      }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    try {
      return await db.orm.public.ProductVariant.where({ id })
        .select(...variantFields)
        .update(changes);
    } catch (error) {
      throwIfUniqueViolation(
        error,
        'A product variant with this SKU already exists',
      );
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    try {
      await db.orm.public.ProductVariant.where({ id }).delete();
    } catch (error) {
      if ((error as { sqlState?: string }).sqlState === '23503') {
        throw new ConflictException(
          `Product variant ${id} cannot be deleted while referenced by a cart or order`,
        );
      }
      throw error;
    }

    return { message: `Product variant ${id} deleted` };
  }

  private async requireProduct(id: number) {
    const product = await db.orm.public.Product.select('id').first({ id });
    if (!product) {
      throw new NotFoundException(`Product ${id} was not found`);
    }
  }

  private optionalVarchar(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? varchar<50>(trimmed) : null;
  }
}
