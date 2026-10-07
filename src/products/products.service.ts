import { Injectable, NotFoundException } from '@nestjs/common';
import { varchar } from '../common/database/varchar';
import { db } from '../database/db';
import { CreateProductDto, ProductsQueryDto, UpdateProductDto } from './dto';

const productFields = [
  'id',
  'categoryId',
  'name',
  'description',
  'status',
  'createdAt',
  'updatedAt',
] as const;

@Injectable()
export class ProductsService {
  async create(dto: CreateProductDto) {
    await this.requireCategory(dto.categoryId);

    return db.orm.public.Product.select(...productFields).create({
      categoryId: dto.categoryId,
      name: varchar<150>(dto.name.trim()),
      description: this.optionalText(dto.description),
      status: dto.status ?? 'ACTIVE',
    });
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
    const product = await db.orm.public.Product.select(...productFields).first({
      id,
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} was not found`);
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);
    if (dto.categoryId !== undefined) {
      await this.requireCategory(dto.categoryId);
    }

    const changes = {
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      ...(dto.name !== undefined && { name: varchar<150>(dto.name.trim()) }),
      ...(dto.description !== undefined && {
        description: this.optionalText(dto.description),
      }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    return db.orm.public.Product.where({ id })
      .select(...productFields)
      .update(changes);
  }

  async remove(id: number) {
    await this.findOne(id);
    await db.orm.public.Product.where({ id }).delete();
    return { message: `Product ${id} deleted` };
  }

  private async requireCategory(id: number) {
    const category = await db.orm.public.Category.select('id').first({ id });
    if (!category) {
      throw new NotFoundException(`Category ${id} was not found`);
    }
  }

  private optionalText(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }
}
