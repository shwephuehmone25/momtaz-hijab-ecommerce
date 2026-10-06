jest.mock('../database/db', () => ({
  db: {
    orm: {
      public: {
        Category: { select: jest.fn(), where: jest.fn() },
        Product: { where: jest.fn() },
      },
    },
  },
}));

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { db } from '../database/db';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  const categoryFirst = jest.fn();
  const categoryCreate = jest.fn();
  const categoryUpdate = jest.fn();
  const categoryDelete = jest.fn();
  const productAggregate = jest.fn();
  const selectAfterWhere = jest.fn();
  let service: CategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoriesService();
    (db.orm.public.Category.select as jest.Mock).mockReturnValue({
      create: categoryCreate,
      first: categoryFirst,
    });
    (db.orm.public.Category.where as jest.Mock).mockReturnValue({
      select: selectAfterWhere,
      delete: categoryDelete,
    });
    selectAfterWhere.mockReturnValue({ update: categoryUpdate });
    (db.orm.public.Product.where as jest.Mock).mockReturnValue({
      aggregate: productAggregate,
    });
  });

  it('creates a normalized root category', async () => {
    categoryCreate.mockResolvedValue({ id: 3 });

    await service.create({
      name: '  Chiffon  ',
      description: '  ',
      imageUrl: null,
    });

    expect(categoryCreate).toHaveBeenCalledWith({
      parentId: null,
      name: 'Chiffon',
      description: null,
      imageUrl: null,
    });
  });

  it('rejects a missing parent category', async () => {
    categoryFirst.mockResolvedValue(null);

    await expect(
      service.create({ name: 'Child', parentId: 99 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(categoryCreate).not.toHaveBeenCalled();
  });

  it('rejects self-parenting', async () => {
    categoryFirst.mockResolvedValue({ id: 3, parentId: null });

    await expect(service.update(3, { parentId: 3 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(categoryUpdate).not.toHaveBeenCalled();
  });

  it('prevents deleting a category that contains products', async () => {
    categoryFirst.mockResolvedValue({ id: 3, parentId: null });
    productAggregate.mockResolvedValue({ total: 1 });

    await expect(service.remove(3)).rejects.toBeInstanceOf(ConflictException);
    expect(categoryDelete).not.toHaveBeenCalled();
  });

  it('deletes an empty category', async () => {
    categoryFirst.mockResolvedValue({ id: 3, parentId: null });
    productAggregate.mockResolvedValue({ total: 0 });

    await expect(service.remove(3)).resolves.toEqual({
      message: 'Category 3 deleted',
    });
    expect(categoryDelete).toHaveBeenCalled();
  });
});
