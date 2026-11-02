import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Temporal as TemporalApi } from 'temporal-polyfill';
import { throwIfUniqueViolation } from '../common/database/database-error';
import { numeric } from '../common/database/numeric';
import { varchar } from '../common/database/varchar';
import { db } from '../database/db';
import {
  CreateProductDto,
  ProductVariantInputDto,
  ProductStatus,
  ProductsQueryDto,
  PublicProductsQueryDto,
  PublicProductSort,
  UpdateProductDto,
  UpdateProductVariantInputDto,
} from './dto';

const productFields = [
  'id',
  'categoryId',
  'name',
  'description',
  'status',
  'isBestSeller',
  'isVisible',
  'bestSellerOrder',
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
          isBestSeller: dto.isBestSeller ?? false,
          isVisible: dto.isVisible ?? true,
          bestSellerOrder: dto.bestSellerOrder ?? null,
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

  async findPublic(query: PublicProductsQueryDto) {
    return this.findPublicProducts(query, false);
  }

  async findPublicBestSellers(query: PublicProductsQueryDto) {
    return this.findPublicProducts(query, true);
  }

  private async findPublicProducts(
    query: PublicProductsQueryDto,
    bestSellersOnly: boolean,
  ) {
    const search = query.search?.trim();
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      Number(query.minPrice) > Number(query.maxPrice)
    ) {
      throw new BadRequestException('minPrice cannot exceed maxPrice');
    }

    let products = this.publicProductQuery()
      .where({ status: ProductStatus.ACTIVE, isVisible: true })
      .where((product) =>
        product.variants.some((variant) =>
          variant.status.eq(ProductStatus.ACTIVE),
        ),
      );

    if (bestSellersOnly) {
      products = products.where({ isBestSeller: true });
    }

    if (search) {
      const { or } = await import('@prisma/orm-postgres/orm-client');
      products = products.where((product) =>
        or(
          product.name.ilike(`%${search}%`),
          product.description.ilike(`%${search}%`),
        ),
      );
    }
    if (query.categoryId !== undefined) {
      products = products.where({ categoryId: query.categoryId });
    }
    const variantTerms = [
      ['color', query.color?.trim()],
      ['style', query.style?.trim()],
      ['size', query.size?.trim()],
    ] as const;
    if (
      query.minPrice !== undefined ||
      query.maxPrice !== undefined ||
      variantTerms.some(([, value]) => Boolean(value))
    ) {
      const { and } = await import('@prisma/orm-postgres/orm-client');
      products = products.where((product) =>
        product.variants.some((variant) => {
          const predicates = [variant.status.eq(ProductStatus.ACTIVE)];
          if (query.minPrice !== undefined) {
            predicates.push(variant.price.gte(numeric<10, 2>(query.minPrice)));
          }
          if (query.maxPrice !== undefined) {
            predicates.push(variant.price.lte(numeric<10, 2>(query.maxPrice)));
          }
          for (const [field, term] of variantTerms) {
            if (term) {
              predicates.push(variant[field].ilike(`%${term}%`));
            }
          }
          return and(...predicates);
        }),
      );
    }

    const ordered = bestSellersOnly
      ? products.orderBy([
          (product) => product.bestSellerOrder.asc({ nulls: 'last' }),
          (product) => product.createdAt.desc(),
          (product) => product.id.desc(),
        ])
      : query.sort === PublicProductSort.OLDEST
        ? products.orderBy([
            (product) => product.createdAt.asc(),
            (product) => product.id.asc(),
          ])
        : query.sort === PublicProductSort.NAME_ASC
          ? products.orderBy([
              (product) => product.name.asc(),
              (product) => product.id.asc(),
            ])
          : query.sort === PublicProductSort.NAME_DESC
            ? products.orderBy([
                (product) => product.name.desc(),
                (product) => product.id.desc(),
              ])
            : products.orderBy([
                (product) => product.createdAt.desc(),
                (product) => product.id.desc(),
              ]);

    const [rows, totalResult] = await Promise.all([
      ordered
        .limit(query.limit)
        .offset((query.page - 1) * query.limit)
        .all(),
      products.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);

    return {
      items: rows.map((product) => this.serializePublicProduct(product)),
      page: query.page,
      limit: query.limit,
      total: totalResult.total,
    };
  }

  async findPublicOne(id: number) {
    const product = await this.publicProductQuery()
      .where({ status: ProductStatus.ACTIVE, isVisible: true })
      .where((candidate) =>
        candidate.variants.some((variant) =>
          variant.status.eq(ProductStatus.ACTIVE),
        ),
      )
      .first({ id });

    if (!product) {
      throw new NotFoundException(`Product ${id} was not found`);
    }

    return this.serializePublicProduct(product);
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
          ...(dto.isBestSeller !== undefined && {
            isBestSeller: dto.isBestSeller,
          }),
          ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
          ...(dto.bestSellerOrder !== undefined && {
            bestSellerOrder: dto.bestSellerOrder,
          }),
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

  private publicProductQuery() {
    return db.orm.public.Product.select(
      'id',
      'categoryId',
      'name',
      'description',
      'createdAt',
      'isBestSeller',
      'bestSellerOrder',
    )
      .include('category', (category) =>
        category.select('id', 'parentId', 'name', 'description', 'imageUrl'),
      )
      .include('variants', (variants) =>
        variants
          .select(
            'id',
            'sku',
            'color',
            'style',
            'size',
            'price',
            'compareAtPrice',
          )
          .where({ status: ProductStatus.ACTIVE })
          .include('inventory', (inventory) =>
            inventory.select('quantity', 'reservedQuantity'),
          )
          .orderBy((variant) => variant.id.asc()),
      )
      .include('images', (images) =>
        images
          .select('id', 'imageUrl', 'sortOrder')
          .orderBy((image) => image.sortOrder.asc()),
      )
      .include('reviews', (reviews) =>
        reviews.combine({
          rating: reviews.avg('rating'),
          total: reviews.count(),
        }),
      );
  }

  private serializePublicProduct(product: {
    id: number;
    categoryId: number;
    name: string;
    description: string | null;
    createdAt: TemporalApi.PlainDateTime;
    isBestSeller: boolean;
    bestSellerOrder: number | null;
    category: {
      id: number;
      parentId: number | null;
      name: string;
      description: string | null;
      imageUrl: string | null;
    } | null;
    images: Array<{ id: number; imageUrl: string; sortOrder: number }>;
    reviews: { rating: number | null; total: number };
    variants: Array<{
      id: number;
      sku: string;
      color: string | null;
      style: string | null;
      size: string | null;
      price: string;
      compareAtPrice: string | null;
      inventory: { quantity: number; reservedQuantity: number } | null;
    }>;
  }) {
    const variants = product.variants.map(({ inventory, ...variant }) => {
      const availableQuantity = Math.max(
        0,
        (inventory?.quantity ?? 0) - (inventory?.reservedQuantity ?? 0),
      );
      return {
        ...variant,
        name:
          [variant.color, variant.style, variant.size]
            .filter(Boolean)
            .join(' / ') || variant.sku,
        stock: availableQuantity,
        availableQuantity,
        inStock: availableQuantity > 0,
      };
    });
    const prices = variants.map((variant) => Number(variant.price));
    const compareAtPrices = variants
      .map((variant) => Number(variant.compareAtPrice))
      .filter((price) => Number.isFinite(price) && price > 0);
    const gallery = product.images.map((image) => image.imageUrl);
    const category = product.category ?? {
      id: product.categoryId,
      parentId: null,
      name: 'Collection',
      description: null,
      imageUrl: null,
    };
    const availableQuantity = variants.reduce(
      (total, variant) => total + variant.availableQuantity,
      0,
    );

    return {
      id: product.id,
      slug: String(product.id),
      categoryId: product.categoryId,
      category: category.name,
      categoryDetails: category,
      name: product.name,
      description: product.description,
      price: prices.length > 0 ? Math.min(...prices) : 0,
      originalPrice:
        compareAtPrices.length > 0 ? Math.min(...compareAtPrices) : null,
      image: gallery[0] ?? null,
      gallery,
      rating: product.reviews.rating ?? 0,
      reviews: product.reviews.total,
      isNew:
        Date.now() -
          product.createdAt.toZonedDateTime('UTC').epochMilliseconds <=
        30 * 24 * 60 * 60 * 1000,
      isBestSeller: product.isBestSeller,
      bestSellerOrder: product.bestSellerOrder,
      availableQuantity,
      inStock: availableQuantity > 0,
      images: product.images,
      variants,
    };
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
