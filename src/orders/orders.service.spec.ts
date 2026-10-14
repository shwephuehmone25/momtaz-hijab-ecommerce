import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrderStatus } from './dto';
import { OrdersService } from './orders.service';

describe('OrdersService business rules', () => {
  const service = new OrdersService();

  it.each([
    [OrderStatus.PENDING, OrderStatus.CONFIRMED],
    [OrderStatus.PENDING, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED, OrderStatus.PROCESSING],
    [OrderStatus.PROCESSING, OrderStatus.SHIPPED],
    [OrderStatus.SHIPPED, OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
  ])('allows %s -> %s', (from, to) => {
    expect(() => service.assertTransition(from, to)).not.toThrow();
  });

  it.each([
    [OrderStatus.PENDING, OrderStatus.SHIPPED],
    [OrderStatus.CONFIRMED, OrderStatus.DELIVERED],
    [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.CANCELLED, OrderStatus.PENDING],
    [OrderStatus.REFUNDED, OrderStatus.PENDING],
  ])('rejects %s -> %s', (from, to) => {
    expect(() => service.assertTransition(from, to)).toThrow(ConflictException);
  });

  it('coalesces duplicate variants before stock validation and pricing', () => {
    expect(
      service.normalizeItems([
        { variantId: 4, quantity: 2 },
        { variantId: 5, quantity: 1 },
        { variantId: 4, quantity: 3 },
      ]),
    ).toEqual([
      { variantId: 4, quantity: 5 },
      { variantId: 5, quantity: 1 },
    ]);
  });

  it('uses exact cents arithmetic and rejects malformed money', () => {
    expect(service.toCents('123456789.99')).toBe(12345678999n);
    expect(service.fromCents(12345678999n)).toBe('123456789.99');
    expect(() => service.parseMoney('-1.00', 'shippingFee')).toThrow(
      BadRequestException,
    );
    expect(() => service.parseMoney('1.999', 'shippingFee')).toThrow(
      BadRequestException,
    );
  });
});
