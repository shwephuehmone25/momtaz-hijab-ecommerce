import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrderManagementGuard } from '../auth/auth.guard';
import { CustomerOwnershipGuard } from '../auth/customer-auth.guard';
import {
  AdminCreateOrderDto,
  AdminUpdateOrderDto,
  CreateOrderDto,
  OrdersQueryDto,
  UpdateOrderDto,
} from './dto';
import { OrderDetailResponse, PaginatedOrdersResponse } from './order.response';
import { OrdersService } from './orders.service';

@ApiTags('Admin Orders')
@Controller('api/v1/admin/orders')
@UseGuards(OrderManagementGuard)
@ApiBearerAuth()
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an order for a customer' })
  @ApiCreatedResponse({ type: OrderDetailResponse })
  @ApiBadRequestResponse({
    description: 'Invalid product, price, or order data',
  })
  @ApiConflictResponse({ description: 'Insufficient inventory' })
  create(@Body() dto: AdminCreateOrderDto) {
    return this.ordersService.createForAdmin(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders for admin management' })
  @ApiOkResponse({ type: PaginatedOrdersResponse })
  findAll(@Query() query: OrdersQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order' })
  @ApiOkResponse({ type: OrderDetailResponse })
  @ApiNotFoundResponse({ description: 'Order not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an eligible order or transition its status',
  })
  @ApiOkResponse({ type: OrderDetailResponse })
  @ApiConflictResponse({
    description: 'Order is not editable or status transition is invalid',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateOrderDto,
  ) {
    return this.ordersService.updateForAdmin(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a cancelled or refunded order' })
  @ApiOkResponse({ description: 'Order deleted' })
  @ApiConflictResponse({
    description: 'Only cancelled or refunded orders can be deleted',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.removeByAdmin(id);
  }
}

@ApiTags('Customer Orders')
@Controller('api/v1/customers/:customerId/orders')
@UseGuards(CustomerOwnershipGuard)
@ApiBearerAuth()
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an order' })
  @ApiCreatedResponse({ type: OrderDetailResponse })
  @ApiConflictResponse({ description: 'Insufficient inventory' })
  @ApiForbiddenResponse({ description: 'Customer ownership mismatch' })
  create(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createForCustomer(customerId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List the authenticated customer's orders" })
  @ApiOkResponse({ type: PaginatedOrdersResponse })
  findAll(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query() query: OrdersQueryDto,
  ) {
    return this.ordersService.findAll(query, customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an owned order' })
  @ApiOkResponse({ type: OrderDetailResponse })
  @ApiNotFoundResponse({ description: 'Order not found' })
  findOne(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.findOne(id, customerId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an owned pending order' })
  @ApiOkResponse({ type: OrderDetailResponse })
  @ApiConflictResponse({ description: 'Only pending orders can be edited' })
  update(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.updateForCustomer(customerId, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an owned pending or confirmed order' })
  @ApiOkResponse({ type: OrderDetailResponse })
  @ApiConflictResponse({ description: 'Order can no longer be cancelled' })
  cancel(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.cancelForCustomer(customerId, id);
  }
}
