import { Injectable } from '@nestjs/common';
import { Temporal } from 'temporal-polyfill';
import { db } from '../database/db';
import { DashboardPeriod, DashboardRange } from './dto';

type Period = {
  range: DashboardRange;
  days: number;
  start: Temporal.PlainDateTime;
  end: Temporal.PlainDateTime;
  previousStart: Temporal.PlainDateTime;
};

@Injectable()
export class DashboardService {
  async getOverview(range: DashboardRange) {
    const period = this.getPeriod(range);
    const [metrics, series, recentOrders, trendingProducts, recentActivities] =
      await Promise.all([
        this.getMetricsForPeriod(period),
        this.getSalesSeriesForPeriod(period),
        this.getRecentOrders(),
        this.getTrendingProducts(period),
        this.getRecentActivities(),
      ]);

    return {
      period: this.serializePeriod(period),
      metrics,
      series,
      recentOrders,
      trendingProducts,
      recentActivities,
      generatedAt: Temporal.Now.instant().toString(),
    };
  }

  getMetrics(range: DashboardRange) {
    return this.getMetricsForPeriod(this.getPeriod(range));
  }

  getSalesSeries(range: DashboardRange) {
    return this.getSalesSeriesForPeriod(this.getPeriod(range));
  }

  async getLegacySalesSeries(period: DashboardPeriod) {
    const range = this.rangeForPeriod(period);
    const series = await this.getSalesSeriesForPeriod(this.getPeriod(range));

    if (period !== DashboardPeriod.WEEKLY) {
      return series.revenue.map((point, index) => ({
        period: point.date,
        total_revenue: Number(point.revenue),
        total_orders: series.orders[index]?.count ?? 0,
      }));
    }

    const weeks = new Map<
      string,
      { period: string; total_revenue: number; total_orders: number }
    >();
    for (const [index, point] of series.revenue.entries()) {
      const date = Temporal.PlainDate.from(point.date);
      const weekStart = date.subtract({ days: date.dayOfWeek - 1 }).toString();
      const current = weeks.get(weekStart) ?? {
        period: weekStart,
        total_revenue: 0,
        total_orders: 0,
      };
      current.total_revenue += Number(point.revenue);
      current.total_orders += series.orders[index]?.count ?? 0;
      weeks.set(weekStart, current);
    }
    return [...weeks.values()];
  }

  async getTopProducts(
    period?: DashboardPeriod,
    range?: DashboardRange,
    limit = 10,
  ) {
    const resolvedRange = range ?? this.rangeForPeriod(period);
    const products = await this.getTrendingProducts(
      this.getPeriod(resolvedRange),
      limit,
    );
    return products.map((product) => ({
      product_id: product.productId,
      product_name: product.productName,
      sku: product.sku,
      total_sold: product.quantitySold,
      total_revenue: Number(product.revenue),
      image_url: null,
    }));
  }

  async getRecentActivities(limit = 12) {
    const perType = Math.max(5, limit);
    const [customers, orders, carts, products] = await Promise.all([
      db.orm.public.Customer.select('id', 'name', 'email', 'createdAt')
        .orderBy((customer) => customer.createdAt.desc())
        .limit(perType)
        .all(),
      db.orm.public.Order.select('id', 'status', 'total', 'createdAt')
        .include('customer', (customer) => customer.select('name'))
        .orderBy((order) => order.createdAt.desc())
        .limit(perType)
        .all(),
      db.orm.public.Cart.select('id', 'customerId', 'status', 'createdAt')
        .orderBy((cart) => cart.createdAt.desc())
        .limit(perType)
        .all(),
      db.orm.public.Product.select('id', 'name', 'status', 'createdAt')
        .orderBy((product) => product.createdAt.desc())
        .limit(perType)
        .all(),
    ]);

    return [
      ...customers.map((customer) => ({
        id: `customer-${customer.id}`,
        type: 'CUSTOMER' as const,
        title: 'New customer registered',
        description: `${customer.name} (${customer.email})`,
        occurredAt: String(customer.createdAt),
      })),
      ...orders.map((order) => ({
        id: `order-${order.id}`,
        type: 'ORDER' as const,
        title: `Order #${order.id} created`,
        description: `${order.customer?.name ?? 'Unknown customer'} · ${String(order.total)} · ${order.status}`,
        occurredAt: String(order.createdAt),
      })),
      ...carts.map((cart) => ({
        id: `cart-${cart.id}`,
        type: 'CART' as const,
        title: `Cart #${cart.id} created`,
        description: `Customer #${cart.customerId} · ${cart.status}`,
        occurredAt: String(cart.createdAt),
      })),
      ...products.map((product) => ({
        id: `product-${product.id}`,
        type: 'PRODUCT' as const,
        title: 'Product added',
        description: `${product.name} · ${product.status}`,
        occurredAt: String(product.createdAt),
      })),
    ]
      .sort(
        (left, right) =>
          this.epochMilliseconds(right.occurredAt) -
          this.epochMilliseconds(left.occurredAt),
      )
      .slice(0, limit);
  }

  private async getMetricsForPeriod(period: Period) {
    const currentCustomers = db.orm.public.Customer.where((record) =>
      record.createdAt.gte(period.start),
    ).where((record) => record.createdAt.lt(period.end));
    const previousCustomers = db.orm.public.Customer.where((record) =>
      record.createdAt.gte(period.previousStart),
    ).where((record) => record.createdAt.lt(period.start));
    const currentOrders = db.orm.public.Order.where((record) =>
      record.createdAt.gte(period.start),
    ).where((record) => record.createdAt.lt(period.end));
    const previousOrders = db.orm.public.Order.where((record) =>
      record.createdAt.gte(period.previousStart),
    ).where((record) => record.createdAt.lt(period.start));
    const currentPayments = db.orm.public.Payment.where({ status: 'PAID' })
      .where((record) => record.createdAt.gte(period.start))
      .where((record) => record.createdAt.lt(period.end));
    const previousPayments = db.orm.public.Payment.where({ status: 'PAID' })
      .where((record) => record.createdAt.gte(period.previousStart))
      .where((record) => record.createdAt.lt(period.start));

    const [
      customerTotal,
      customerCurrent,
      customerPrevious,
      productTotal,
      productActive,
      productInactive,
      productArchived,
      orderTotal,
      orderCurrent,
      orderPrevious,
      cartTotal,
      cartActive,
      cartAbandoned,
      cartConverted,
      revenueTotal,
      revenueCurrent,
      revenuePrevious,
      paidPayments,
    ] = await Promise.all([
      db.orm.public.Customer.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
      currentCustomers.aggregate((aggregate) => ({ total: aggregate.count() })),
      previousCustomers.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
      db.orm.public.Product.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
      db.orm.public.Product.where({ status: 'ACTIVE' }).aggregate(
        (aggregate) => ({ total: aggregate.count() }),
      ),
      db.orm.public.Product.where({ status: 'INACTIVE' }).aggregate(
        (aggregate) => ({ total: aggregate.count() }),
      ),
      db.orm.public.Product.where({ status: 'ARCHIVED' }).aggregate(
        (aggregate) => ({ total: aggregate.count() }),
      ),
      db.orm.public.Order.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
      currentOrders.aggregate((aggregate) => ({ total: aggregate.count() })),
      previousOrders.aggregate((aggregate) => ({ total: aggregate.count() })),
      db.orm.public.Cart.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
      db.orm.public.Cart.where({ status: 'ACTIVE' }).aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
      db.orm.public.Cart.where({ status: 'ABANDONED' }).aggregate(
        (aggregate) => ({ total: aggregate.count() }),
      ),
      db.orm.public.Cart.where({ status: 'CONVERTED' }).aggregate(
        (aggregate) => ({ total: aggregate.count() }),
      ),
      db.orm.public.Payment.where({ status: 'PAID' }).aggregate(
        (aggregate) => ({ total: aggregate.sum('amount') }),
      ),
      currentPayments.aggregate((aggregate) => ({
        total: aggregate.sum('amount'),
      })),
      previousPayments.aggregate((aggregate) => ({
        total: aggregate.sum('amount'),
      })),
      currentPayments.aggregate((aggregate) => ({ total: aggregate.count() })),
    ]);

    const currentRevenue = String(revenueCurrent.total ?? '0');
    const previousRevenue = String(revenuePrevious.total ?? '0');

    return {
      customers: {
        total: customerTotal.total,
        currentPeriod: customerCurrent.total,
        previousPeriod: customerPrevious.total,
        changePercent: this.percentChange(
          customerCurrent.total,
          customerPrevious.total,
        ),
      },
      products: {
        total: productTotal.total,
        active: productActive.total,
        inactive: productInactive.total,
        archived: productArchived.total,
      },
      orders: {
        total: orderTotal.total,
        currentPeriod: orderCurrent.total,
        previousPeriod: orderPrevious.total,
        changePercent: this.percentChange(
          orderCurrent.total,
          orderPrevious.total,
        ),
      },
      carts: {
        total: cartTotal.total,
        active: cartActive.total,
        abandoned: cartAbandoned.total,
        converted: cartConverted.total,
      },
      sales: {
        totalRevenue: this.money(String(revenueTotal.total ?? '0')),
        currentPeriodRevenue: this.money(currentRevenue),
        previousPeriodRevenue: this.money(previousRevenue),
        changePercent: this.moneyPercentChange(currentRevenue, previousRevenue),
        averageOrderValue:
          paidPayments.total === 0
            ? '0.00'
            : this.fromCents(
                this.toCents(currentRevenue) / BigInt(paidPayments.total),
              ),
        paidPayments: paidPayments.total,
      },
    };
  }

  private async getSalesSeriesForPeriod(period: Period) {
    const [payments, orders, customers] = await Promise.all([
      db.orm.public.Payment.select('amount', 'createdAt')
        .where({ status: 'PAID' })
        .where((record) => record.createdAt.gte(period.start))
        .where((record) => record.createdAt.lt(period.end))
        .all(),
      db.orm.public.Order.select('id', 'createdAt')
        .where((record) => record.createdAt.gte(period.start))
        .where((record) => record.createdAt.lt(period.end))
        .all(),
      db.orm.public.Customer.select('id', 'createdAt')
        .where((record) => record.createdAt.gte(period.start))
        .where((record) => record.createdAt.lt(period.end))
        .all(),
    ]);

    const dates = this.periodDates(period);
    const revenue = new Map(dates.map((date) => [date, 0n]));
    const orderCounts = new Map(dates.map((date) => [date, 0]));
    const customerCounts = new Map(dates.map((date) => [date, 0]));

    for (const payment of payments) {
      const date = this.dateKey(String(payment.createdAt));
      revenue.set(
        date,
        (revenue.get(date) ?? 0n) + this.toCents(String(payment.amount)),
      );
    }
    for (const order of orders) {
      const date = this.dateKey(String(order.createdAt));
      orderCounts.set(date, (orderCounts.get(date) ?? 0) + 1);
    }
    for (const customer of customers) {
      const date = this.dateKey(String(customer.createdAt));
      customerCounts.set(date, (customerCounts.get(date) ?? 0) + 1);
    }

    return {
      revenue: dates.map((date) => ({
        date,
        revenue: this.fromCents(revenue.get(date) ?? 0n),
      })),
      orders: dates.map((date) => ({
        date,
        count: orderCounts.get(date) ?? 0,
      })),
      customers: dates.map((date) => ({
        date,
        count: customerCounts.get(date) ?? 0,
      })),
    };
  }

  private async getRecentOrders(limit = 8) {
    const orders = await db.orm.public.Order.select(
      'id',
      'customerId',
      'status',
      'total',
      'createdAt',
    )
      .include('customer', (customer) => customer.select('name', 'email'))
      .include('items', (items) => items.count())
      .orderBy((order) => order.createdAt.desc())
      .limit(limit)
      .all();

    return orders.map((order) => ({
      id: order.id,
      customerId: order.customerId,
      customerName: order.customer?.name ?? 'Unknown customer',
      customerEmail: order.customer?.email ?? '',
      status: order.status,
      total: this.money(String(order.total)),
      itemCount: order.items,
      createdAt: String(order.createdAt),
    }));
  }

  private async getTrendingProducts(period: Period, limit = 6) {
    const orders = await db.orm.public.Order.select('id')
      .where((order) =>
        order.status.in([
          'PENDING',
          'CONFIRMED',
          'PROCESSING',
          'SHIPPED',
          'DELIVERED',
        ]),
      )
      .where((record) => record.createdAt.gte(period.start))
      .where((record) => record.createdAt.lt(period.end))
      .all();
    if (orders.length === 0) return [];

    const orderIds = orders.map((order) => order.id);
    const items = await db.orm.public.OrderItem.select(
      'variantId',
      'productName',
      'sku',
      'quantity',
      'totalPrice',
    )
      .include('variant', (variant) => variant.select('productId'))
      .where((item) => item.orderId.in(orderIds))
      .all();

    const products = new Map<
      number,
      {
        productId: number;
        variantId: number;
        productName: string;
        sku: string;
        quantitySold: number;
        revenueCents: bigint;
      }
    >();
    for (const item of items) {
      if (!item.variant) continue;
      const productId = item.variant.productId;
      const current = products.get(productId) ?? {
        productId,
        variantId: item.variantId,
        productName: String(item.productName),
        sku: String(item.sku),
        quantitySold: 0,
        revenueCents: 0n,
      };
      current.quantitySold += item.quantity;
      current.revenueCents += this.toCents(String(item.totalPrice));
      products.set(productId, current);
    }

    return [...products.values()]
      .sort(
        (left, right) =>
          right.quantitySold - left.quantitySold ||
          Number(right.revenueCents - left.revenueCents),
      )
      .slice(0, limit)
      .map(({ revenueCents, ...product }) => ({
        ...product,
        revenue: this.fromCents(revenueCents),
      }));
  }

  private getPeriod(range: DashboardRange): Period {
    const days = {
      [DashboardRange.SEVEN_DAYS]: 7,
      [DashboardRange.THIRTY_DAYS]: 30,
      [DashboardRange.NINETY_DAYS]: 90,
    }[range];
    const today = Temporal.Now.zonedDateTimeISO('Asia/Yangon')
      .toPlainDateTime()
      .with({
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0,
      });
    const end = today.add({ days: 1 });
    const start = end.subtract({ days });
    return {
      range,
      days,
      start,
      end,
      previousStart: start.subtract({ days }),
    };
  }

  private rangeForPeriod(period?: DashboardPeriod) {
    switch (period) {
      case DashboardPeriod.MONTH:
      case DashboardPeriod.WEEKLY:
        return DashboardRange.THIRTY_DAYS;
      case DashboardPeriod.YEAR:
        return DashboardRange.NINETY_DAYS;
      case DashboardPeriod.DAILY:
      case DashboardPeriod.WEEK:
      default:
        return DashboardRange.SEVEN_DAYS;
    }
  }

  private serializePeriod(period: Period) {
    return {
      range: period.range,
      startDate: period.start.toPlainDate().toString(),
      endDate: period.end.subtract({ days: 1 }).toPlainDate().toString(),
    };
  }

  private periodDates(period: Period) {
    return Array.from({ length: period.days }, (_, index) =>
      period.start.add({ days: index }).toPlainDate().toString(),
    );
  }

  private dateKey(value: string) {
    return value.slice(0, 10);
  }

  private epochMilliseconds(value: string) {
    return Date.parse(`${value}Z`);
  }

  private percentChange(current: number, previous: number) {
    if (previous === 0) return current === 0 ? 0 : null;
    return Math.round(((current - previous) / previous) * 10_000) / 100;
  }

  private moneyPercentChange(current: string, previous: string) {
    const currentCents = this.toCents(current);
    const previousCents = this.toCents(previous);
    if (previousCents === 0n) return currentCents === 0n ? 0 : null;
    return (
      Number(((currentCents - previousCents) * 10_000n) / previousCents) / 100
    );
  }

  private money(value: string) {
    return this.fromCents(this.toCents(value));
  }

  private toCents(value: string) {
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
  }

  private fromCents(value: bigint) {
    return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
  }
}
