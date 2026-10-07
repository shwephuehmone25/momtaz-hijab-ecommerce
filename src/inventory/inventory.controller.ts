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
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateInventoryDto,
  InventoryQueryDto,
  UpdateInventoryDto,
} from './dto';
import {
  InventoryResponse,
  PaginatedInventoryResponse,
} from './inventory.response';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@Controller('api/v1/admin/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create inventory for a product variant' })
  @ApiCreatedResponse({ type: InventoryResponse })
  @ApiNotFoundResponse({ description: 'Product variant not found' })
  @ApiConflictResponse({ description: 'Inventory already exists for variant' })
  @ApiBadRequestResponse({ description: 'Invalid stock quantities' })
  create(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List inventory records' })
  @ApiOkResponse({ type: PaginatedInventoryResponse })
  findAll(@Query() query: InventoryQueryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an inventory record' })
  @ApiOkResponse({ type: InventoryResponse })
  @ApiNotFoundResponse({ description: 'Inventory not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory quantities' })
  @ApiOkResponse({ type: InventoryResponse })
  @ApiNotFoundResponse({ description: 'Inventory not found' })
  @ApiBadRequestResponse({ description: 'Invalid stock quantities' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an inventory record' })
  @ApiOkResponse({ description: 'Inventory deleted' })
  @ApiNotFoundResponse({ description: 'Inventory not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.remove(id);
  }
}
