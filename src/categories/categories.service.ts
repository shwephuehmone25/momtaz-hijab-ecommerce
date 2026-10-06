import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { varchar } from '../common/database/varchar';
import { db } from '../database/db';
import {
  CategoriesQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto';

const categoryFields = [
  'id',
  'parentId',
  'name',
  'description',
  'imageUrl',
  'createdAt',
  'updatedAt',
] as const;

@Injectable()
export class CategoriesService {
  async create(dto: CreateCategoryDto) {
    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.requireCategory(dto.parentId);
    }

    return db.orm.public.Category.select(...categoryFields).create({
      parentId: dto.parentId ?? null,
      name: varchar<100>(dto.name.trim()),
      description: this.optionalText(dto.description),
      imageUrl: this.optionalVarchar<255>(dto.imageUrl),
    });
  }

  async findAll(query: CategoriesQueryDto) {
    const search = query.search?.trim();
    let categories = db.orm.public.Category.select(...categoryFields);

    if (search) {
      categories = categories.where((category) =>
        category.name.ilike(`%${search}%`),
      );
    }
    if (query.parentId !== undefined) {
      categories = categories.where({ parentId: query.parentId });
    }
    if (query.onlyChildren) {
      categories = categories.where((category) =>
        category.parentId.isNotNull(),
      );
    }

    const [items, totalResult] = await Promise.all([
      categories
        .orderBy([
          (category) => category.createdAt.desc(),
          (category) => category.id.desc(),
        ])
        .limit(query.limit)
        .offset((query.page - 1) * query.limit)
        .all(),
      categories.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total: totalResult.total,
    };
  }

  async findOne(id: number) {
    const category = await db.orm.public.Category.select(
      ...categoryFields,
    ).first({ id });

    if (!category) {
      throw new NotFoundException(`Category ${id} was not found`);
    }

    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.parentId !== undefined) {
      await this.validateParent(id, dto.parentId);
    }

    const changes = {
      ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      ...(dto.name !== undefined && { name: varchar<100>(dto.name.trim()) }),
      ...(dto.description !== undefined && {
        description: this.optionalText(dto.description),
      }),
      ...(dto.imageUrl !== undefined && {
        imageUrl: this.optionalVarchar<255>(dto.imageUrl),
      }),
    };

    return db.orm.public.Category.where({ id })
      .select(...categoryFields)
      .update(changes);
  }

  async remove(id: number) {
    await this.findOne(id);
    const products = await db.orm.public.Product.where({
      categoryId: id,
    }).aggregate((aggregate) => ({ total: aggregate.count() }));

    if (products.total > 0) {
      throw new ConflictException(
        `Category ${id} cannot be deleted while it contains products`,
      );
    }

    await db.orm.public.Category.where({ id }).delete();
    return { message: `Category ${id} deleted` };
  }

  private async requireCategory(id: number) {
    const category = await db.orm.public.Category.select(
      'id',
      'parentId',
    ).first({ id });

    if (!category) {
      throw new NotFoundException(`Category ${id} was not found`);
    }

    return category;
  }

  private async validateParent(categoryId: number, parentId: number | null) {
    if (parentId === null) return;
    if (parentId === categoryId) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    const visited = new Set<number>();
    let currentId: number | null = parentId;
    while (currentId !== null) {
      if (currentId === categoryId || visited.has(currentId)) {
        throw new BadRequestException(
          'The selected parent would create a category cycle',
        );
      }
      visited.add(currentId);
      const current = await this.requireCategory(currentId);
      currentId = current.parentId;
    }
  }

  private optionalText(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private optionalVarchar<N extends number>(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? varchar<N>(trimmed) : null;
  }
}
