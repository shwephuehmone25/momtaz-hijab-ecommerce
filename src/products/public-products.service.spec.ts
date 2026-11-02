/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
jest.mock('../database/db', () => ({
  db: { orm: { public: { Product: { select: jest.fn() } } } },
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '../database/db';
import { PublicProductSort } from './dto';
import { ProductsService } from './products.service';

describe('Public products', () => {
  const all = jest.fn();
  const first = jest.fn();
  const aggregate = jest.fn();
  const variantWhere = jest.fn();
  let query: any;
  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService();

    const operation = () => ({ type: 'predicate' });
    const variantProxy = {
      status: { eq: operation },
      price: { gte: operation, lte: operation },
      color: { ilike: operation },
      style: { ilike: operation },
      size: { ilike: operation },
    };
    const productProxy = {
      name: { ilike: operation, asc: operation, desc: operation },
      description: { ilike: operation },
      createdAt: { asc: operation, desc: operation },
      id: { asc: operation, desc: operation },
      bestSellerOrder: { asc: operation },
      variants: {
        some: (callback: (variant: typeof variantProxy) => unknown) =>
          callback(variantProxy),
      },
    };
    const relation = {
      select: jest.fn(),
      where: variantWhere,
      include: jest.fn(),
      orderBy: jest.fn(),
      avg: jest.fn(),
      count: jest.fn(),
      combine: jest.fn(),
    };
    relation.select.mockReturnValue(relation);
    relation.where.mockReturnValue(relation);
    relation.include.mockImplementation(
      (_name: string, callback: (nested: typeof relation) => unknown) => {
        callback(relation);
        return relation;
      },
    );
    relation.orderBy.mockReturnValue(relation);
    relation.avg.mockReturnValue({ type: 'average' });
    relation.count.mockReturnValue({ type: 'count' });
    relation.combine.mockReturnValue(relation);

    query = {
      include: jest.fn(),
      where: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
      offset: jest.fn(),
      all,
      first,
      aggregate,
    };
    query.include.mockImplementation(
      (_name: string, callback: (nested: typeof relation) => unknown) => {
        callback(relation);
        return query;
      },
    );
    query.where.mockImplementation((filter: unknown) => {
      if (typeof filter === 'function') filter(productProxy);
      return query;
    });
    query.orderBy.mockImplementation(
      (callbacks: Array<(p: unknown) => void>) => {
        for (const callback of callbacks) callback(productProxy);
        return query;
      },
    );
    query.limit.mockReturnValue(query);
    query.offset.mockReturnValue(query);
    (db.orm.public.Product.select as jest.Mock).mockReturnValue(query);
    aggregate.mockResolvedValue({ total: 1 });
  });

  it('returns only the public shape and derives available stock', async () => {
    all.mockResolvedValue([
      {
        id: 1,
        categoryId: 2,
        name: 'Chiffon',
        description: null,
        createdAt: {
          toZonedDateTime: () => ({ epochMilliseconds: Date.now() }),
        },
        isBestSeller: false,
        bestSellerOrder: null,
        category: {
          id: 2,
          parentId: null,
          name: 'Hijab',
          description: null,
          imageUrl: null,
        },
        reviews: { rating: 4.5, total: 2 },
        images: [{ id: 3, imageUrl: '/image.jpg', sortOrder: 0 }],
        variants: [
          {
            id: 4,
            sku: 'CHI-BLK',
            color: 'Black',
            style: null,
            size: null,
            price: '20.00',
            compareAtPrice: null,
            inventory: { quantity: 8, reservedQuantity: 3 },
          },
        ],
      },
    ]);

    const result = await service.findPublic({
      page: 1,
      limit: 20,
      sort: PublicProductSort.NEWEST,
    });

    expect(result.items[0].variants[0]).toEqual(
      expect.objectContaining({ availableQuantity: 5, inStock: true }),
    );
    expect(result.items[0].variants[0]).not.toHaveProperty('inventory');
    expect(result.items[0]).not.toHaveProperty('status');
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        slug: '1',
        category: 'Hijab',
        price: 20,
        image: '/image.jpg',
        rating: 4.5,
        reviews: 2,
        availableQuantity: 5,
        inStock: true,
      }),
    );
    expect(query.where).toHaveBeenCalledWith({
      status: 'ACTIVE',
      isVisible: true,
    });
    expect(variantWhere).toHaveBeenCalledWith({ status: 'ACTIVE' });
  });

  it('filters and prioritizes best sellers with stable fallback ordering', async () => {
    all.mockResolvedValue([]);

    await service.findPublicBestSellers({
      page: 1,
      limit: 20,
      sort: PublicProductSort.NAME_ASC,
    });

    expect(query.where).toHaveBeenCalledWith({
      status: 'ACTIVE',
      isVisible: true,
    });
    expect(query.where).toHaveBeenCalledWith({ isBestSeller: true });
    expect(query.orderBy).toHaveBeenCalledTimes(1);
  });

  it('rejects an inverted price range', async () => {
    await expect(
      service.findPublic({
        page: 1,
        limit: 20,
        sort: PublicProductSort.NEWEST,
        minPrice: '30.00',
        maxPrice: '20.00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hides inactive or unavailable product details as not found', async () => {
    first.mockResolvedValue(null);

    await expect(service.findPublicOne(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
