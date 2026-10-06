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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  CustomersQueryDto,
  UpdateCustomerDto,
} from './dto';

@ApiTags('Customers')
@Controller('api/v1/admin/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer' })
  @ApiCreatedResponse({ description: 'Customer created' })
  @ApiConflictResponse({ description: 'Email is already registered' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customers' })
  @ApiOkResponse({ description: 'Paginated customer list' })
  findAll(@Query() query: CustomersQueryDto) {
    return this.customersService.findAll(query.page, query.limit, query.search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiOkResponse({ description: 'Customer updated' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiConflictResponse({ description: 'Email is already registered' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a customer' })
  @ApiOkResponse({ description: 'Customer deleted' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.remove(id);
  }
}
