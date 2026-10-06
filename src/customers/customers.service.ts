import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../database/db';
import { hashPassword } from '../common/security/password';
import { throwIfUniqueViolation } from '../common/database/database-error';
import { varchar } from '../common/database/varchar';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

const customerFields = [
  'id',
  'name',
  'email',
  'phone',
  'createdAt',
  'updatedAt',
] as const;

@Injectable()
export class CustomersService {
  async create(dto: CreateCustomerDto) {
    try {
      return await db.orm.public.Customer.select(...customerFields).create({
        name: varchar<100>(dto.name.trim()),
        email: varchar<100>(dto.email.trim().toLowerCase()),
        passwordHash: varchar<255>(await hashPassword(dto.password)),
        phone: dto.phone ? varchar<20>(dto.phone.trim()) : null,
      });
    } catch (error) {
      throwIfUniqueViolation(
        error,
        'A customer with this email already exists',
      );
    }
  }

  async findAll(page: number, limit: number) {
    const [items, totalResult] = await Promise.all([
      db.orm.public.Customer.select(...customerFields)
        .orderBy((customer) => customer.createdAt.desc())
        .limit(limit)
        .offset((page - 1) * limit)
        .all(),
      db.orm.public.Customer.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
    ]);

    return { items, page, limit, total: totalResult.total };
  }

  async findOne(id: number) {
    const customer = await db.orm.public.Customer.select(
      ...customerFields,
    ).first({ id });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} was not found`);
    }

    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);

    const changes = {
      ...(dto.name !== undefined && { name: varchar<100>(dto.name.trim()) }),
      ...(dto.email !== undefined && {
        email: varchar<100>(dto.email.trim().toLowerCase()),
      }),
      ...(dto.phone !== undefined && {
        phone: dto.phone.trim() ? varchar<20>(dto.phone.trim()) : null,
      }),
      ...(dto.password !== undefined && {
        passwordHash: varchar<255>(await hashPassword(dto.password)),
      }),
    };

    try {
      return await db.orm.public.Customer.where({ id })
        .select(...customerFields)
        .update(changes);
    } catch (error) {
      throwIfUniqueViolation(
        error,
        'A customer with this email already exists',
      );
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    await db.orm.public.Customer.where({ id }).delete();

    return { message: `Customer ${id} deleted` };
  }
}
