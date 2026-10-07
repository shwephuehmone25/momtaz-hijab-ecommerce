jest.mock('../database/db', () => ({
  db: {
    orm: {
      public: {
        ProductVariant: { select: jest.fn() },
        Inventory: { select: jest.fn(), where: jest.fn() },
      },
    },
  },
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '../database/db';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  const variantFirst = jest.fn();
  const inventoryFirst = jest.fn();
  const inventoryCreate = jest.fn();
  const inventoryUpdate = jest.fn();
  const inventoryDelete = jest.fn();
  const selectAfterWhere = jest.fn();
  let service: InventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryService();
    variantFirst.mockResolvedValue({ id: 4 });
    (db.orm.public.ProductVariant.select as jest.Mock).mockReturnValue({
      first: variantFirst,
    });
    (db.orm.public.Inventory.select as jest.Mock).mockReturnValue({
      first: inventoryFirst,
      create: inventoryCreate,
    });
    (db.orm.public.Inventory.where as jest.Mock).mockReturnValue({
      select: selectAfterWhere,
      delete: inventoryDelete,
    });
    selectAfterWhere.mockReturnValue({ update: inventoryUpdate });
  });

  it('creates inventory and computes available quantity', async () => {
    inventoryCreate.mockResolvedValue({
      id: 1,
      variantId: 4,
      quantity: 10,
      reservedQuantity: 3,
      updatedAt: 'now',
    });

    await expect(
      service.create({ variantId: 4, quantity: 10, reservedQuantity: 3 }),
    ).resolves.toEqual(expect.objectContaining({ availableQuantity: 7 }));
  });

  it('rejects inventory for a missing variant', async () => {
    variantFirst.mockResolvedValue(null);

    await expect(service.create({ variantId: 99 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(inventoryCreate).not.toHaveBeenCalled();
  });

  it('rejects reserved quantity greater than physical quantity', async () => {
    await expect(
      service.create({ variantId: 4, quantity: 2, reservedQuantity: 3 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(inventoryCreate).not.toHaveBeenCalled();
  });

  it('validates partial updates against the current stock values', async () => {
    inventoryFirst.mockResolvedValue({
      id: 1,
      variantId: 4,
      quantity: 10,
      reservedQuantity: 8,
      updatedAt: 'now',
    });

    await expect(service.update(1, { quantity: 5 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(inventoryUpdate).not.toHaveBeenCalled();
  });
});
