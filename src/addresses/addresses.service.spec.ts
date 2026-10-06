jest.mock('../database/db', () => ({
  db: {
    orm: {
      public: {
        Customer: { select: jest.fn() },
        Address: { select: jest.fn(), where: jest.fn() },
      },
    },
  },
}));

import { NotFoundException } from '@nestjs/common';
import { db } from '../database/db';
import { AddressesService } from './addresses.service';

describe('AddressesService', () => {
  const customerFirst = jest.fn();
  const addressFirst = jest.fn();
  const addressCreate = jest.fn();
  const addressUpdate = jest.fn();
  const addressDelete = jest.fn();
  const addressSelectAfterWhere = jest.fn();
  const addressWhereAfterSelect = jest.fn();
  let service: AddressesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AddressesService();

    (db.orm.public.Customer.select as jest.Mock).mockReturnValue({
      first: customerFirst,
    });
    (db.orm.public.Address.select as jest.Mock).mockReturnValue({
      create: addressCreate,
      where: addressWhereAfterSelect,
    });
    addressWhereAfterSelect.mockReturnValue({ first: addressFirst });
    (db.orm.public.Address.where as jest.Mock).mockReturnValue({
      select: addressSelectAfterWhere,
      delete: addressDelete,
    });
    addressSelectAfterWhere.mockReturnValue({ update: addressUpdate });
    customerFirst.mockResolvedValue({ id: 7 });
  });

  it('creates an address for an existing customer and normalizes optional fields', async () => {
    addressCreate.mockResolvedValue({ id: 11 });

    await expect(
      service.create(7, {
        addressLine1: '  42 Inya Road  ',
        addressLine2: '   ',
        city: ' Yangon ',
        state: null,
        postalCode: ' 11041 ',
        country: ' Myanmar ',
      }),
    ).resolves.toEqual({ id: 11 });

    expect(addressCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 7,
        addressLine1: '42 Inya Road',
        addressLine2: null,
        city: 'Yangon',
        state: null,
        postalCode: '11041',
        country: 'Myanmar',
      }),
    );
  });

  it('rejects creation when the customer does not exist', async () => {
    customerFirst.mockResolvedValue(null);

    await expect(
      service.create(99, {
        addressLine1: '42 Inya Road',
        city: 'Yangon',
        country: 'Myanmar',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(addressCreate).not.toHaveBeenCalled();
  });

  it('scopes item reads to both customer and address IDs', async () => {
    addressFirst.mockResolvedValue({ id: 11, customerId: 7 });

    await service.findOne(7, 11);

    expect(addressWhereAfterSelect).toHaveBeenCalledWith({
      customerId: 7,
      id: 11,
    });
  });

  it('does not expose an address owned by another customer', async () => {
    addressFirst.mockResolvedValue(null);

    await expect(service.findOne(8, 11)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates and deletes using ownership-scoped predicates', async () => {
    addressFirst.mockResolvedValue({ id: 11, customerId: 7 });
    addressUpdate.mockResolvedValue({ id: 11, city: 'Mandalay' });

    await service.update(7, 11, { city: ' Mandalay ' });
    await service.remove(7, 11);

    expect(addressUpdate).toHaveBeenCalledWith({ city: 'Mandalay' });
    expect(addressDelete).toHaveBeenCalled();
  });
});
