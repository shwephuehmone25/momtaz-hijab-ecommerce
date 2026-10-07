jest.mock('../database/db', () => ({
  db: {
    orm: {
      public: {
        Product: { select: jest.fn() },
        ProductVariant: { select: jest.fn(), where: jest.fn() },
      },
    },
  },
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { db } from '../database/db';
import { ProductVariantsService } from './product-variants.service';

describe('ProductVariantsService', () => {
  const productFirst = jest.fn();
  const variantFirst = jest.fn();
  const variantCreate = jest.fn();
  const variantDelete = jest.fn();
  let service: ProductVariantsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductVariantsService();
    productFirst.mockResolvedValue({ id: 2 });
    (db.orm.public.Product.select as jest.Mock).mockReturnValue({
      first: productFirst,
    });
    (db.orm.public.ProductVariant.select as jest.Mock).mockReturnValue({
      first: variantFirst,
      create: variantCreate,
    });
    (db.orm.public.ProductVariant.where as jest.Mock).mockReturnValue({
      delete: variantDelete,
    });
  });

  it('creates a normalized product variant', async () => {
    variantCreate.mockResolvedValue({ id: 8 });

    await service.create({
      productId: 2,
      sku: ' chiffon-black-m ',
      color: ' Black ',
      price: '29.99',
    });

    expect(variantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 2,
        sku: 'CHIFFON-BLACK-M',
        color: 'Black',
        price: '29.99',
        status: 'ACTIVE',
      }),
    );
  });

  it('rejects a missing product', async () => {
    productFirst.mockResolvedValue(null);

    await expect(
      service.create({ productId: 99, sku: 'SKU', price: '10.00' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(variantCreate).not.toHaveBeenCalled();
  });

  it('translates duplicate SKU errors into a conflict', async () => {
    variantCreate.mockRejectedValue({ sqlState: '23505' });

    await expect(
      service.create({ productId: 2, sku: 'SKU', price: '10.00' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks deletion when a cart or order references the variant', async () => {
    variantFirst.mockResolvedValue({ id: 8 });
    variantDelete.mockRejectedValue({ sqlState: '23503' });

    await expect(service.remove(8)).rejects.toBeInstanceOf(ConflictException);
  });
});
