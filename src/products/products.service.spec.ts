/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/unbound-method */
jest.mock('../database/db', () => ({
  db: { transaction: jest.fn(), orm: { public: {} } },
}));

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { db } from '../database/db';
import { CreateProductDto, ProductStatus, UpdateProductDto } from './dto';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const categoryFirst = jest.fn();
  const productExistsFirst = jest.fn();
  const productDetailFirst = jest.fn();
  const productCreate = jest.fn();
  const productUpdate = jest.fn();
  const variantCreate = jest.fn();
  const variantUpdate = jest.fn();
  const variantDelete = jest.fn();
  const existingVariantsAll = jest.fn();
  const inventoryCreate = jest.fn();
  const inventoryUpdate = jest.fn();
  const productDetailQuery = {
    include: jest.fn(),
    first: productDetailFirst,
  };
  let models: any;
  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService();
    productDetailQuery.include.mockReturnValue(productDetailQuery);
    categoryFirst.mockResolvedValue({ id: 2 });
    productExistsFirst.mockResolvedValue({ id: 9 });
    productCreate.mockResolvedValue({ id: 9 });
    productDetailFirst.mockResolvedValue({ id: 9, variants: [], images: [] });
    variantCreate.mockResolvedValue({ id: 20 });
    existingVariantsAll.mockResolvedValue([]);

    models = {
      Category: {
        select: jest.fn().mockReturnValue({ first: categoryFirst }),
      },
      Product: {
        select: jest.fn((...fields: string[]) =>
          fields.length === 1 && fields[0] === 'id'
            ? { first: productExistsFirst }
            : { create: productCreate, include: productDetailQuery.include },
        ),
        where: jest.fn().mockReturnValue({
          update: productUpdate,
          delete: jest.fn(),
        }),
      },
      ProductVariant: {
        create: variantCreate,
        select: jest.fn().mockReturnValue({
          include: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({ all: existingVariantsAll }),
          }),
        }),
        where: jest.fn().mockReturnValue({
          update: variantUpdate,
          delete: variantDelete,
        }),
      },
      Inventory: {
        create: inventoryCreate,
        where: jest.fn().mockReturnValue({ update: inventoryUpdate }),
      },
    };
    (db.orm as any).public = models;
    (db.transaction as jest.Mock).mockImplementation((callback) =>
      callback({ orm: { public: models } }),
    );
  });

  it('creates a product with multiple variants and inventory atomically', async () => {
    variantCreate
      .mockResolvedValueOnce({ id: 20 })
      .mockResolvedValueOnce({ id: 21 });
    await service.create({
      categoryId: 2,
      name: '  Luxury Chiffon  ',
      description: '  Lightweight hijab  ',
      status: ProductStatus.INACTIVE,
      variants: [
        { sku: ' chiffon-black-m ', price: '29.99', quantity: 8 },
        { sku: 'chiffon-cream-l', price: '31.99', quantity: 5 },
      ],
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(productCreate).toHaveBeenCalledWith({
      categoryId: 2,
      name: 'Luxury Chiffon',
      description: 'Lightweight hijab',
      status: ProductStatus.INACTIVE,
      isBestSeller: false,
      isVisible: true,
      bestSellerOrder: null,
    });
    expect(variantCreate).toHaveBeenCalledTimes(2);
    expect(variantCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        productId: 9,
        sku: 'CHIFFON-BLACK-M',
        price: '29.99',
      }),
    );
    expect(inventoryCreate).toHaveBeenNthCalledWith(1, {
      variantId: 20,
      quantity: 8,
      reservedQuantity: 0,
    });
  });

  it('creates and updates storefront merchandising fields', async () => {
    await service.create({
      categoryId: 2,
      name: 'Featured Product',
      isBestSeller: true,
      isVisible: false,
      bestSellerOrder: 0,
    });

    expect(productCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        isBestSeller: true,
        isVisible: false,
        bestSellerOrder: 0,
      }),
    );

    await service.update(9, { isVisible: true, bestSellerOrder: null });
    expect(productUpdate).toHaveBeenCalledWith({
      isVisible: true,
      bestSellerOrder: null,
    });
  });

  it('validates storefront merchandising fields', async () => {
    const createDto = plainToInstance(CreateProductDto, {
      categoryId: 2,
      name: 'Product',
      isBestSeller: 'yes',
      isVisible: 1,
      bestSellerOrder: -1,
    });
    const updateDto = plainToInstance(UpdateProductDto, {
      bestSellerOrder: 1.5,
    });

    await expect(validate(createDto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'isBestSeller' }),
        expect.objectContaining({ property: 'isVisible' }),
        expect.objectContaining({ property: 'bestSellerOrder' }),
      ]),
    );
    await expect(validate(updateDto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'bestSellerOrder' }),
      ]),
    );
  });

  it('does not overwrite omitted storefront fields during update', async () => {
    await service.update(9, { name: 'Updated' });

    expect(productUpdate).toHaveBeenCalledWith({ name: 'Updated' });
  });

  it('rejects duplicate normalized SKUs before opening a transaction', async () => {
    await expect(
      service.create({
        categoryId: 2,
        name: 'Product',
        variants: [
          { sku: 'same-sku', price: '10.00' },
          { sku: ' SAME-SKU ', price: '12.00' },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('validates nested variant price and quantity data', async () => {
    const dto = plainToInstance(CreateProductDto, {
      categoryId: 2,
      name: 'Product',
      variants: [{ sku: 'SKU', price: '-1', quantity: -2 }],
    });
    const errors = await validate(dto);
    expect(
      errors.find((error) => error.property === 'variants')?.children,
    ).toBeTruthy();
  });

  it('rejects reserved stock greater than total stock', async () => {
    await expect(
      service.create({
        categoryId: 2,
        name: 'Product',
        variants: [
          { sku: 'SKU', price: '10.00', quantity: 2, reservedQuantity: 3 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing category without creating any records', async () => {
    categoryFirst.mockResolvedValue(null);
    await expect(
      service.create({ categoryId: 99, name: 'Product', variants: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(productCreate).not.toHaveBeenCalled();
  });

  it('propagates a failed transactional write for rollback', async () => {
    variantCreate.mockRejectedValue(new Error('variant insert failed'));
    await expect(
      service.create({
        categoryId: 2,
        name: 'Product',
        variants: [{ sku: 'SKU', price: '10.00' }],
      }),
    ).rejects.toThrow('variant insert failed');
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it('synchronizes updated, new, and removed variants', async () => {
    existingVariantsAll.mockResolvedValue([
      {
        id: 10,
        sku: 'KEEP',
        color: null,
        style: null,
        size: null,
        price: '10.00',
        compareAtPrice: null,
        status: 'ACTIVE',
        inventory: { id: 30, quantity: 5, reservedQuantity: 1 },
      },
      {
        id: 11,
        sku: 'REMOVE',
        color: null,
        style: null,
        size: null,
        price: '12.00',
        compareAtPrice: null,
        status: 'ACTIVE',
        inventory: null,
      },
    ]);
    variantCreate.mockResolvedValue({ id: 22 });

    await service.update(9, {
      name: ' Updated ',
      variants: [
        { id: 10, price: '11.00', quantity: 7 },
        { sku: 'NEW', price: '15.00', quantity: 3 },
      ],
    });

    expect(productUpdate).toHaveBeenCalledWith({ name: 'Updated' });
    expect(variantDelete).toHaveBeenCalledTimes(1);
    expect(variantUpdate).toHaveBeenCalledWith({ price: '11.00' });
    expect(inventoryUpdate).toHaveBeenCalledWith({
      quantity: 7,
      reservedQuantity: 1,
    });
    expect(variantCreate).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 9, sku: 'NEW' }),
    );
  });

  it('maps database SKU violations to conflict', async () => {
    variantCreate.mockRejectedValue({ sqlState: '23505' });
    await expect(
      service.create({
        categoryId: 2,
        name: 'Product',
        variants: [{ sku: 'TAKEN', price: '10.00' }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps referenced variant deletion constraints to conflict', async () => {
    existingVariantsAll.mockResolvedValue([
      {
        id: 11,
        sku: 'REFERENCED',
        color: null,
        style: null,
        size: null,
        price: '12.00',
        compareAtPrice: null,
        status: 'ACTIVE',
        inventory: null,
      },
    ]);
    variantDelete.mockRejectedValue({ sqlState: '23503' });
    await expect(service.update(9, { variants: [] })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
