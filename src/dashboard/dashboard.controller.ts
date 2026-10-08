import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  DashboardMetricsResponse,
  DashboardOverviewResponse,
  DashboardSalesResponse,
  LegacySalesPointResponse,
  RecentActivityResponse,
  TopProductResponse,
} from './dashboard.response';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto, DashboardRange, TopProductsQueryDto } from './dto';

@ApiTags('Admin Dashboard')
@ApiExtraModels(DashboardSalesResponse, LegacySalesPointResponse)
@Controller('api/v1/admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get all dashboard overview data' })
  @ApiOkResponse({ type: DashboardOverviewResponse })
  overview(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getOverview(
      query.range ?? DashboardRange.SEVEN_DAYS,
    );
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Get customer, product, order, cart, and sales metrics',
  })
  @ApiOkResponse({ type: DashboardMetricsResponse })
  metrics(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getMetrics(
      query.range ?? DashboardRange.SEVEN_DAYS,
    );
  }

  @Get('sales')
  @ApiOperation({ summary: 'Get daily revenue, order, and customer series' })
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/DashboardSalesResponse' },
        {
          type: 'array',
          items: { $ref: '#/components/schemas/LegacySalesPointResponse' },
        },
      ],
    },
  })
  sales(@Query() query: DashboardQueryDto) {
    if (query.period) {
      return this.dashboardService.getLegacySalesSeries(query.period);
    }
    return this.dashboardService.getSalesSeries(
      query.range ?? DashboardRange.SEVEN_DAYS,
    );
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get the best-selling products for a period' })
  @ApiOkResponse({ type: [TopProductResponse] })
  topProducts(@Query() query: TopProductsQueryDto) {
    return this.dashboardService.getTopProducts(
      query.period,
      query.range,
      query.limit,
    );
  }

  @Get('recent-activities')
  @ApiOperation({
    summary: 'Get recent customer, product, order, and cart activity',
  })
  @ApiOkResponse({ type: [RecentActivityResponse] })
  recentActivities() {
    return this.dashboardService.getRecentActivities();
  }
}
