import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersQueryDto } from './dto';
import { PaginatedOrdersResponse } from './order.response';
import { OrdersService } from './orders.service';

@ApiTags('Admin Orders')
@Controller('api/v1/admin/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders for admin management' })
  @ApiOkResponse({ type: PaginatedOrdersResponse })
  findAll(@Query() query: OrdersQueryDto) {
    return this.ordersService.findAll(query);
  }
}
