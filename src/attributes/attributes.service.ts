import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { throwIfUniqueViolation } from '../common/database/database-error';
import { varchar } from '../common/database/varchar';
import { db } from '../database/db';
import {
  CreateAttributeDto,
  CreateAttributeValueDto,
  UpdateAttributeDto,
  UpdateAttributeValueDto,
} from './dto';

const attributeFields = [
  'id',
  'name',
  'slug',
  'type',
  'orderBy',
  'createdAt',
  'updatedAt',
] as const;

const valueFields = ['id', 'attributeId', 'value', 'orderBy'] as const;

@Injectable()
export class AttributesService {
  async findAll() {
    const attributes = await db.orm.public.ProductAttribute.select(
      ...attributeFields,
    )
      .orderBy([
        (attribute) => attribute.orderBy.asc(),
        (attribute) => attribute.id.asc(),
      ])
      .all();

    return attributes.map((attribute) => this.toAttributeResponse(attribute));
  }

  async create(dto: CreateAttributeDto) {
    const name = dto.name.trim();
    const slug = this.normalizeSlug(dto.slug ?? name);

    try {
      const attribute = await db.orm.public.ProductAttribute.select(
        ...attributeFields,
      ).create({
        name: varchar<100>(name),
        slug: varchar<100>(slug),
        type: varchar<20>(dto.type ?? 'select'),
        orderBy: dto.order_by ?? 0,
      });
      return this.toAttributeResponse(attribute);
    } catch (error) {
      throwIfUniqueViolation(error, `An attribute with slug "${slug}" already exists`);
    }
  }

  async findOne(id: number) {
    const attribute = await this.requireAttribute(id);
    const values = await this.findValues(id);
    return { ...this.toAttributeResponse(attribute), values };
  }

  async update(id: number, dto: UpdateAttributeDto) {
    await this.requireAttribute(id);
    const changes = {
      ...(dto.name !== undefined && { name: varchar<100>(dto.name.trim()) }),
      ...(dto.slug !== undefined && {
        slug: varchar<100>(this.normalizeSlug(dto.slug)),
      }),
      ...(dto.type !== undefined && { type: varchar<20>(dto.type) }),
      ...(dto.order_by !== undefined && { orderBy: dto.order_by }),
    };

    try {
      const attribute = await db.orm.public.ProductAttribute.where({ id })
        .select(...attributeFields)
        .update(changes);
      if (!attribute) {
        throw new NotFoundException(`Attribute ${id} was not found`);
      }
      return this.toAttributeResponse(attribute);
    } catch (error) {
      throwIfUniqueViolation(error, 'An attribute with this slug already exists');
    }
  }

  async remove(id: number) {
    await this.requireAttribute(id);
    const values = await db.orm.public.ProductAttributeValue.where({
      attributeId: id,
    }).aggregate((aggregate) => ({ total: aggregate.count() }));

    if (values.total > 0) {
      throw new ConflictException(
        `Attribute ${id} cannot be deleted while it has values`,
      );
    }

    await db.orm.public.ProductAttribute.where({ id }).delete();
    return { message: `Attribute ${id} deleted` };
  }

  async findValues(attributeId: number) {
    await this.requireAttribute(attributeId);
    const values = await db.orm.public.ProductAttributeValue.select(
      ...valueFields,
    )
      .where({ attributeId })
      .orderBy([
        (value) => value.orderBy.asc(),
        (value) => value.id.asc(),
      ])
      .all();

    return values.map((value) => this.toValueResponse(value));
  }

  async createValue(attributeId: number, dto: CreateAttributeValueDto) {
    await this.requireAttribute(attributeId);
    try {
      const value = await db.orm.public.ProductAttributeValue.select(
        ...valueFields,
      ).create({
        attributeId,
        value: varchar<100>(dto.value.trim()),
        orderBy: dto.order_by ?? 0,
      });
      return this.toValueResponse(value);
    } catch (error) {
      throwIfUniqueViolation(error, 'This attribute value already exists');
    }
  }

  async updateValue(
    attributeId: number,
    valueId: number,
    dto: UpdateAttributeValueDto,
  ) {
    await this.requireValue(attributeId, valueId);
    const changes = {
      ...(dto.value !== undefined && {
        value: varchar<100>(dto.value.trim()),
      }),
      ...(dto.order_by !== undefined && { orderBy: dto.order_by }),
    };

    try {
      const value = await db.orm.public.ProductAttributeValue.where({
        id: valueId,
        attributeId,
      })
        .select(...valueFields)
        .update(changes);
      if (!value) {
        throw new NotFoundException(
          `Attribute value ${valueId} was not found for attribute ${attributeId}`,
        );
      }
      return this.toValueResponse(value);
    } catch (error) {
      throwIfUniqueViolation(error, 'This attribute value already exists');
    }
  }

  async removeValue(attributeId: number, valueId: number) {
    await this.requireValue(attributeId, valueId);
    await db.orm.public.ProductAttributeValue.where({
      id: valueId,
      attributeId,
    }).delete();
    return { message: `Attribute value ${valueId} deleted` };
  }

  private async requireAttribute(id: number) {
    const attribute = await db.orm.public.ProductAttribute.select(
      ...attributeFields,
    ).first({ id });
    if (!attribute) {
      throw new NotFoundException(`Attribute ${id} was not found`);
    }
    return attribute;
  }

  private async requireValue(attributeId: number, id: number) {
    const value = await db.orm.public.ProductAttributeValue.select(
      ...valueFields,
    ).first({ id, attributeId });
    if (!value) {
      throw new NotFoundException(
        `Attribute value ${id} was not found for attribute ${attributeId}`,
      );
    }
    return value;
  }

  private normalizeSlug(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) {
      throw new ConflictException('Attribute slug cannot be empty');
    }
    return slug;
  }

  private toAttributeResponse(attribute: {
    id: number;
    name: string;
    slug: string;
    type: string;
    orderBy: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: attribute.id,
      name: attribute.name,
      slug: attribute.slug,
      type: attribute.type,
      order_by: attribute.orderBy,
      created_at: attribute.createdAt,
      updated_at: attribute.updatedAt,
    };
  }

  private toValueResponse(value: {
    id: number;
    attributeId: number;
    value: string;
    orderBy: number;
  }) {
    return {
      id: value.id,
      attribute_id: value.attributeId,
      value: value.value,
      order_by: value.orderBy,
    };
  }
}
