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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CartResponse } from './cart.response';
import { CartsService } from './carts.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto';

@ApiTags('Customer Cart')
@Controller('api/v1/customers/:customerId/cart')
export class CustomerCartController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  @ApiOperation({ summary: "Retrieve a customer's active cart" })
  @ApiOkResponse({ type: CartResponse })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  findActive(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.cartsService.getActiveCart(customerId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a product variant to the active cart' })
  @ApiCreatedResponse({ type: CartResponse })
  @ApiNotFoundResponse({ description: 'Customer or product variant not found' })
  @ApiBadRequestResponse({
    description: 'Variant is unavailable or out of stock',
  })
  addItem(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartsService.addItem(customerId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update an active cart item quantity' })
  @ApiOkResponse({ type: CartResponse })
  @ApiNotFoundResponse({ description: 'Active cart or cart item not found' })
  @ApiBadRequestResponse({ description: 'Requested quantity is unavailable' })
  updateItem(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateCustomerItem(customerId, itemId, dto);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an item from the active cart' })
  @ApiOkResponse({ type: CartResponse })
  @ApiNotFoundResponse({ description: 'Active cart or cart item not found' })
  removeItem(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.cartsService.removeCustomerItem(customerId, itemId);
  }
}
