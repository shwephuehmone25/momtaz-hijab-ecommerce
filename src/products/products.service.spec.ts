jest.mock('../database/db', () => ({
  db: {
    orm: {
      public: {
        Category: { select: jest.fn() },
        Product: { select: jest.fn(), where: jest.fn() },
      },
    },
  },
}));

import { NotFoundException } from '@nestjs/common';
import { db } from '../database/db';
import { ProductStatus } from './dto';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const categoryFirst = jest.fn();
  const productFirst = jest.fn();
  const productCreate = jest.fn();
  const productUpdate = jest.fn();
  const productDelete = jest.fn();
  const whereAfterSelect = jest.fn();
  const selectAfterWhere = jest.fn();
  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService();
    categoryFirst.mockResolvedValue({ id: 2 });
    (db.orm.public.Category.select as jest.Mock).mockReturnValue({
      first: categoryFirst,
    });
    (db.orm.public.Product.select as jest.Mock).mockReturnValue({
      create: productCreate,
      first: productFirst,
      where: whereAfterSelect,
    });
    (db.orm.public.Product.where as jest.Mock).mockReturnValue({
      select: selectAfterWhere,
      delete: productDelete,
    });
    selectAfterWhere.mockReturnValue({ update: productUpdate });
  });

  it('creates a normalized product in an existing category', async () => {
    productCreate.mockResolvedValue({ id: 9 });

    await service.create({
      categoryId: 2,
      name: '  Luxury Chiffon  ',
      description: '  Lightweight hijab  ',
      status: ProductStatus.INACTIVE,
    });

    expect(productCreate).toHaveBeenCalledWith({
      categoryId: 2,
      name: 'Luxury Chiffon',
      description: 'Lightweight hijab',
      status: ProductStatus.INACTIVE,
    });
  });

  it('rejects a missing category', async () => {
    categoryFirst.mockResolvedValue(null);

    await expect(
      service.create({ categoryId: 99, name: 'Product' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(productCreate).not.toHaveBeenCalled();
  });

  it('updates and deletes an existing product', async () => {
    productFirst.mockResolvedValue({ id: 9, categoryId: 2 });
    productUpdate.mockResolvedValue({ id: 9, name: 'Updated' });

    await service.update(9, { name: ' Updated ' });
    await service.remove(9);

    expect(productUpdate).toHaveBeenCalledWith({ name: 'Updated' });
    expect(productDelete).toHaveBeenCalled();
  });
});
