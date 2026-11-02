import { ConflictException } from '@nestjs/common';
import { ShipmentStatus } from './dto';
import { ShipmentsService } from './shipments.service';

describe('ShipmentsService status rules', () => {
  const service = new ShipmentsService();

  it.each([
    [ShipmentStatus.PENDING, ShipmentStatus.PROCESSING],
    [ShipmentStatus.PENDING, ShipmentStatus.CANCELLED],
    [ShipmentStatus.PROCESSING, ShipmentStatus.SHIPPED],
    [ShipmentStatus.SHIPPED, ShipmentStatus.IN_TRANSIT],
    [ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED],
    [ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED],
  ])('allows %s -> %s', (from, to) => {
    expect(() => service.assertTransition(from, to)).not.toThrow();
  });

  it.each([
    [ShipmentStatus.PENDING, ShipmentStatus.DELIVERED],
    [ShipmentStatus.PROCESSING, ShipmentStatus.DELIVERED],
    [ShipmentStatus.IN_TRANSIT, ShipmentStatus.PROCESSING],
    [ShipmentStatus.CANCELLED, ShipmentStatus.PENDING],
    [ShipmentStatus.RETURNED, ShipmentStatus.SHIPPED],
  ])('rejects %s -> %s', (from, to) => {
    expect(() => service.assertTransition(from, to)).toThrow(ConflictException);
  });
});
