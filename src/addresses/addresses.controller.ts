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
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto';
import {
  AddressResponse,
  PaginatedAddressesResponse,
} from './address.response';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto';

@ApiTags('Addresses')
@Controller('api/v1/admin/customers/:customerId/addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a saved address for a customer' })
  @ApiCreatedResponse({ type: AddressResponse })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  create(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(customerId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List a customer's saved addresses" })
  @ApiOkResponse({ type: PaginatedAddressesResponse })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  findAll(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.addressesService.findAll(customerId, query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one saved address' })
  @ApiOkResponse({ type: AddressResponse })
  @ApiNotFoundResponse({ description: 'Address not found for customer' })
  findOne(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressesService.findOne(customerId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved address' })
  @ApiOkResponse({ type: AddressResponse })
  @ApiNotFoundResponse({ description: 'Address not found for customer' })
  update(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(customerId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a saved address' })
  @ApiOkResponse({ description: 'Address deleted' })
  @ApiNotFoundResponse({ description: 'Address not found for customer' })
  remove(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.addressesService.remove(customerId, id);
  }
}
