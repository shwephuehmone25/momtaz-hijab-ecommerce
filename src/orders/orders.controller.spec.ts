import {
  AdminOrdersController,
  CustomerOrdersController,
} from './orders.controller';
import { OrderStatus } from './dto';

describe('order controllers', () => {
  const service = {
    createForAdmin: jest.fn(),
    createForCustomer: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateForAdmin: jest.fn(),
    updateForCustomer: jest.fn(),
    cancelForCustomer: jest.fn(),
    removeByAdmin: jest.fn(),
  };
  const admin = new AdminOrdersController(service as never);
  const customer = new CustomerOrdersController(service as never);

  beforeEach(() => jest.clearAllMocks());

  it('routes every admin CRUD endpoint to the service', async () => {
    const create = {
      customerId: 7,
      shippingAddress: {},
      billingAddress: {},
      items: [],
    };
    const query = { page: 1, limit: 20 };
    const update = { status: OrderStatus.CONFIRMED };
    service.createForAdmin.mockResolvedValue({ id: 1 });
    service.findAll.mockResolvedValue({ items: [] });
    service.findOne.mockResolvedValue({ id: 1 });
    service.updateForAdmin.mockResolvedValue({ id: 1 });
    service.removeByAdmin.mockResolvedValue({ message: 'Order 1 deleted' });

    await admin.create(create as never);
    await admin.findAll(query);
    await admin.findOne(1);
    await admin.update(1, update);
    await admin.remove(1);

    expect(service.createForAdmin).toHaveBeenCalledWith(create);
    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(service.findOne).toHaveBeenCalledWith(1);
    expect(service.updateForAdmin).toHaveBeenCalledWith(1, update);
    expect(service.removeByAdmin).toHaveBeenCalledWith(1);
  });

  it('always scopes customer endpoints to the route customer id', async () => {
    const create = { shippingAddress: {}, billingAddress: {}, items: [] };
    const query = { page: 1, limit: 20 };
    const update = { shippingAddress: {} };
    service.createForCustomer.mockResolvedValue({ id: 9 });
    service.findAll.mockResolvedValue({ items: [] });
    service.findOne.mockResolvedValue({ id: 9 });
    service.updateForCustomer.mockResolvedValue({ id: 9 });
    service.cancelForCustomer.mockResolvedValue({ id: 9, status: 'CANCELLED' });

    await customer.create(7, create as never);
    await customer.findAll(7, query);
    await customer.findOne(7, 9);
    await customer.update(7, 9, update as never);
    await customer.cancel(7, 9);

    expect(service.createForCustomer).toHaveBeenCalledWith(7, create);
    expect(service.findAll).toHaveBeenCalledWith(query, 7);
    expect(service.findOne).toHaveBeenCalledWith(9, 7);
    expect(service.updateForCustomer).toHaveBeenCalledWith(7, 9, update);
    expect(service.cancelForCustomer).toHaveBeenCalledWith(7, 9);
  });
});
