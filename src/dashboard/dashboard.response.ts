import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardPeriodResponse {
  @ApiProperty({ example: '7d' }) range!: string;
  @ApiProperty({ example: '2026-10-02' }) startDate!: string;
  @ApiProperty({ example: '2026-10-08' }) endDate!: string;
}

export class CountMetricResponse {
  @ApiProperty() total!: number;
  @ApiProperty() currentPeriod!: number;
  @ApiProperty() previousPeriod!: number;
  @ApiProperty({ nullable: true, example: 12.5 }) changePercent!: number | null;
}

export class ProductsMetricResponse {
  @ApiProperty() total!: number;
  @ApiProperty() active!: number;
  @ApiProperty() inactive!: number;
  @ApiProperty() archived!: number;
}

export class CartsMetricResponse {
  @ApiProperty() total!: number;
  @ApiProperty() active!: number;
  @ApiProperty() abandoned!: number;
  @ApiProperty() converted!: number;
}

export class SalesMetricResponse {
  @ApiProperty({ example: '1234.50' }) totalRevenue!: string;
  @ApiProperty({ example: '520.25' }) currentPeriodRevenue!: string;
  @ApiProperty({ example: '410.00' }) previousPeriodRevenue!: string;
  @ApiProperty({ nullable: true, example: 26.89 })
  changePercent!: number | null;
  @ApiProperty({ example: '74.32' }) averageOrderValue!: string;
  @ApiProperty() paidPayments!: number;
}

export class DashboardMetricsResponse {
  @ApiProperty({ type: CountMetricResponse }) customers!: CountMetricResponse;
  @ApiProperty({ type: ProductsMetricResponse })
  products!: ProductsMetricResponse;
  @ApiProperty({ type: CountMetricResponse }) orders!: CountMetricResponse;
  @ApiProperty({ type: CartsMetricResponse }) carts!: CartsMetricResponse;
  @ApiProperty({ type: SalesMetricResponse }) sales!: SalesMetricResponse;
}

export class DashboardSeriesPointResponse {
  @ApiProperty({ example: '2026-10-08' }) date!: string;
  @ApiPropertyOptional({ example: '250.50' }) revenue?: string;
  @ApiPropertyOptional() count?: number;
}

export class DashboardSalesResponse {
  @ApiProperty({ type: [DashboardSeriesPointResponse] })
  revenue!: DashboardSeriesPointResponse[];
  @ApiProperty({ type: [DashboardSeriesPointResponse] })
  orders!: DashboardSeriesPointResponse[];
  @ApiProperty({ type: [DashboardSeriesPointResponse] })
  customers!: DashboardSeriesPointResponse[];
}

export class LegacySalesPointResponse {
  @ApiProperty({ example: '2026-10-08' }) period!: string;
  @ApiProperty({ example: 250.5 }) total_revenue!: number;
  @ApiProperty() total_orders!: number;
}

export class TopProductResponse {
  @ApiProperty() product_id!: number;
  @ApiProperty() product_name!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() total_sold!: number;
  @ApiProperty({ example: 349.5 }) total_revenue!: number;
  @ApiPropertyOptional({ nullable: true }) image_url!: string | null;
}

export class RecentOrderResponse {
  @ApiProperty() id!: number;
  @ApiProperty() customerId!: number;
  @ApiProperty() customerName!: string;
  @ApiProperty() customerEmail!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ example: '89.90' }) total!: string;
  @ApiProperty() itemCount!: number;
  @ApiProperty() createdAt!: string;
}

export class TrendingProductResponse {
  @ApiProperty() variantId!: number;
  @ApiProperty() productName!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() quantitySold!: number;
  @ApiProperty({ example: '349.50' }) revenue!: string;
}

export class RecentActivityResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['CUSTOMER', 'ORDER', 'CART', 'PRODUCT'] })
  type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() occurredAt!: string;
}

export class DashboardOverviewResponse {
  @ApiProperty({ type: DashboardPeriodResponse })
  period!: DashboardPeriodResponse;
  @ApiProperty({ type: DashboardMetricsResponse })
  metrics!: DashboardMetricsResponse;
  @ApiProperty({ type: DashboardSalesResponse })
  series!: DashboardSalesResponse;
  @ApiProperty({ type: [RecentOrderResponse] })
  recentOrders!: RecentOrderResponse[];
  @ApiProperty({ type: [TrendingProductResponse] })
  trendingProducts!: TrendingProductResponse[];
  @ApiProperty({ type: [RecentActivityResponse] })
  recentActivities!: RecentActivityResponse[];
  @ApiProperty() generatedAt!: string;
}
