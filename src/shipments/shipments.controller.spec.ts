import {
  AdminShipmentsController,
  CustomerShipmentsController,
} from './shipments.controller';

describe('shipment controllers', () => {
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const admin = new AdminShipmentsController(service as never);
  const customer = new CustomerShipmentsController(service as never);

  beforeEach(() => jest.clearAllMocks());

  it('routes every admin CRUD endpoint to the service', async () => {
    const create = { orderId: 12 };
    const query = { page: 1, limit: 20 };
    const update = { carrier: 'DHL' };
    service.create.mockResolvedValue({ id: 3 });
    service.findAll.mockResolvedValue({ items: [] });
    service.findOne.mockResolvedValue({ id: 3 });
    service.update.mockResolvedValue({ id: 3 });
    service.remove.mockResolvedValue({ message: 'Shipment 3 deleted' });

    await admin.create(create);
    await admin.findAll(query);
    await admin.findOne(3);
    await admin.update(3, update);
    await admin.remove(3);

    expect(service.create).toHaveBeenCalledWith(create);
    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(service.findOne).toHaveBeenCalledWith(3);
    expect(service.update).toHaveBeenCalledWith(3, update);
    expect(service.remove).toHaveBeenCalledWith(3);
  });

  it('scopes customer tracking endpoints to the route customer id', async () => {
    const query = { page: 1, limit: 20, orderId: 12 };
    service.findAll.mockResolvedValue({ items: [] });
    service.findOne.mockResolvedValue({ id: 3 });

    await customer.findAll(7, query);
    await customer.findOne(7, 3);

    expect(service.findAll).toHaveBeenCalledWith(query, 7);
    expect(service.findOne).toHaveBeenCalledWith(3, 7);
  });
});
