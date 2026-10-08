import { Injectable } from '@nestjs/common';
import { db } from '../database/db';
import { OrdersQueryDto } from './dto';

@Injectable()
export class OrdersService {
  async findAll(query: OrdersQueryDto) {
    const ordersQuery = db.orm.public.Order.select(
      'id',
      'status',
      'total',
      'createdAt',
    );
    const [orders, totalResult] = await Promise.all([
      ordersQuery
        .orderBy([
          (order) => order.createdAt.desc(),
          (order) => order.id.desc(),
        ])
        .limit(query.limit)
        .offset((query.page - 1) * query.limit)
        .all(),
      ordersQuery.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);

    const orderIds = orders.map((order) => order.id);
    const payments =
      orderIds.length === 0
        ? []
        : await db.orm.public.Payment.select('orderId', 'status', 'createdAt')
            .where((payment) => payment.orderId.in(orderIds))
            .orderBy([
              (payment) => payment.createdAt.desc(),
              (payment) => payment.id.desc(),
            ])
            .all();
    const paymentStatusByOrder = new Map<number, string>();
    for (const payment of payments) {
      if (!paymentStatusByOrder.has(payment.orderId)) {
        paymentStatusByOrder.set(payment.orderId, payment.status);
      }
    }

    return {
      items: orders.map((order) => ({
        id: order.id,
        order_key: String(order.id),
        order_status: order.status,
        payment_status: paymentStatusByOrder.get(order.id) ?? 'PENDING',
        order_total: Number(order.total),
        created_at: String(order.createdAt),
      })),
      pagination: {
        page: query.page,
        pageSize: query.limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / query.limit),
      },
    };
  }
}
