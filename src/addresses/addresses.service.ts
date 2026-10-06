import { Injectable, NotFoundException } from '@nestjs/common';
import { varchar } from '../common/database/varchar';
import { db } from '../database/db';
import { CreateAddressDto, UpdateAddressDto } from './dto';

const addressFields = [
  'id',
  'customerId',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postalCode',
  'country',
  'createdAt',
  'updatedAt',
] as const;

@Injectable()
export class AddressesService {
  private async requireCustomer(customerId: number) {
    const customer = await db.orm.public.Customer.select('id').first({
      id: customerId,
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} was not found`);
    }
  }

  async create(customerId: number, dto: CreateAddressDto) {
    await this.requireCustomer(customerId);

    return db.orm.public.Address.select(...addressFields).create({
      customerId,
      addressLine1: varchar<255>(dto.addressLine1.trim()),
      addressLine2: this.optionalVarchar<255>(dto.addressLine2),
      city: varchar<100>(dto.city.trim()),
      state: this.optionalVarchar<100>(dto.state),
      postalCode: this.optionalVarchar<20>(dto.postalCode),
      country: varchar<100>(dto.country.trim()),
    });
  }

  async findAll(customerId: number, page: number, limit: number) {
    await this.requireCustomer(customerId);
    const addresses = db.orm.public.Address.where({ customerId });

    const [items, totalResult] = await Promise.all([
      addresses
        .select(...addressFields)
        .orderBy([
          (address) => address.createdAt.desc(),
          (address) => address.id.desc(),
        ])
        .limit(limit)
        .offset((page - 1) * limit)
        .all(),
      addresses.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);

    return { items, page, limit, total: totalResult.total };
  }

  async findOne(customerId: number, id: number) {
    const address = await db.orm.public.Address.select(...addressFields)
      .where({ customerId, id })
      .first();

    if (!address) {
      throw new NotFoundException(
        `Address ${id} was not found for customer ${customerId}`,
      );
    }

    return address;
  }

  async update(customerId: number, id: number, dto: UpdateAddressDto) {
    await this.findOne(customerId, id);

    const changes = {
      ...(dto.addressLine1 !== undefined && {
        addressLine1: varchar<255>(dto.addressLine1.trim()),
      }),
      ...(dto.addressLine2 !== undefined && {
        addressLine2: this.optionalVarchar<255>(dto.addressLine2),
      }),
      ...(dto.city !== undefined && { city: varchar<100>(dto.city.trim()) }),
      ...(dto.state !== undefined && {
        state: this.optionalVarchar<100>(dto.state),
      }),
      ...(dto.postalCode !== undefined && {
        postalCode: this.optionalVarchar<20>(dto.postalCode),
      }),
      ...(dto.country !== undefined && {
        country: varchar<100>(dto.country.trim()),
      }),
    };

    return db.orm.public.Address.where({ customerId, id })
      .select(...addressFields)
      .update(changes);
  }

  async remove(customerId: number, id: number) {
    await this.findOne(customerId, id);
    await db.orm.public.Address.where({ customerId, id }).delete();

    return { message: `Address ${id} deleted` };
  }

  private optionalVarchar<N extends number>(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? varchar<N>(trimmed) : null;
  }
}
