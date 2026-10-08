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
import { CartResponse, PaginatedCartsResponse } from './cart.response';
import { CartsService } from './carts.service';
import {
  AddCartItemDto,
  CartsQueryDto,
  CreateCartDto,
  UpdateCartDto,
  UpdateCartItemDto,
} from './dto';

@ApiTags('Admin Carts')
@Controller('api/v1/admin/carts')
export class AdminCartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a cart' })
  @ApiCreatedResponse({ type: CartResponse })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiConflictResponse({ description: 'Customer already has an active cart' })
  create(@Body() dto: CreateCartDto) {
    return this.cartsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List carts' })
  @ApiOkResponse({ type: PaginatedCartsResponse })
  findAll(@Query() query: CartsQueryDto) {
    return this.cartsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a cart' })
  @ApiOkResponse({ type: CartResponse })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cartsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a cart' })
  @ApiOkResponse({ type: CartResponse })
  @ApiNotFoundResponse({ description: 'Cart or customer not found' })
  @ApiConflictResponse({ description: 'Customer already has an active cart' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCartDto) {
    return this.cartsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a cart and its items' })
  @ApiOkResponse({ description: 'Cart deleted' })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cartsService.remove(id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add an item to a cart' })
  @ApiCreatedResponse({ type: CartResponse })
  @ApiNotFoundResponse({ description: 'Cart or product variant not found' })
  @ApiBadRequestResponse({
    description: 'Cart/variant unavailable or out of stock',
  })
  addItem(@Param('id', ParseIntPipe) id: number, @Body() dto: AddCartItemDto) {
    return this.cartsService.addAdminItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update a cart item quantity' })
  @ApiOkResponse({ type: CartResponse })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  @ApiBadRequestResponse({ description: 'Requested quantity is unavailable' })
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an item from a cart' })
  @ApiOkResponse({ description: 'Cart item deleted' })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.cartsService.removeItem(id, itemId);
  }
}
