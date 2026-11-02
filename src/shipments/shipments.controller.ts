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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrderManagementGuard } from '../auth/auth.guard';
import { CustomerOwnershipGuard } from '../auth/customer-auth.guard';
import { CreateShipmentDto, ShipmentsQueryDto, UpdateShipmentDto } from './dto';
import {
  PaginatedShipmentsResponse,
  ShipmentResponse,
} from './shipment.response';
import { ShipmentsService } from './shipments.service';

@ApiTags('Admin Shipments')
@Controller('api/v1/admin/shipments')
@UseGuards(OrderManagementGuard)
@ApiBearerAuth()
export class AdminShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a shipment for an order' })
  @ApiCreatedResponse({ type: ShipmentResponse })
  @ApiBadRequestResponse({ description: 'Invalid shipment details or dates' })
  @ApiConflictResponse({ description: 'Order cannot be fulfilled' })
  create(@Body() dto: CreateShipmentDto) {
    return this.shipmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List shipments' })
  @ApiOkResponse({ type: PaginatedShipmentsResponse })
  findAll(@Query() query: ShipmentsQueryDto) {
    return this.shipmentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shipment' })
  @ApiOkResponse({ type: ShipmentResponse })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shipmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shipment details or status' })
  @ApiOkResponse({ type: ShipmentResponse })
  @ApiConflictResponse({
    description: 'Shipment is terminal or transition is invalid',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShipmentDto,
  ) {
    return this.shipmentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a pending or cancelled shipment' })
  @ApiOkResponse({ description: 'Shipment deleted' })
  @ApiConflictResponse({ description: 'Shipment can no longer be deleted' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.shipmentsService.remove(id);
  }
}

@ApiTags('Customer Shipments')
@Controller('api/v1/customers/:customerId/shipments')
@UseGuards(CustomerOwnershipGuard)
@ApiBearerAuth()
export class CustomerShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  @ApiOperation({
    summary: "List and track the authenticated customer's shipments",
  })
  @ApiOkResponse({ type: PaginatedShipmentsResponse })
  findAll(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query() query: ShipmentsQueryDto,
  ) {
    return this.shipmentsService.findAll(query, customerId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get tracking and delivery details for an owned shipment',
  })
  @ApiOkResponse({ type: ShipmentResponse })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  findOne(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.shipmentsService.findOne(id, customerId);
  }
}
