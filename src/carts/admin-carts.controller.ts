import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/auth.guard';
import { CartResponse, PaginatedCartsResponse } from './cart.response';
import { CartsService } from './carts.service';
import { CartsQueryDto } from './dto';

@ApiTags('Admin Carts')
@Controller('api/v1/admin/carts')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminCartsController {
  constructor(private readonly cartsService: CartsService) {}

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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a cart and its items' })
  @ApiOkResponse({ description: 'Cart deleted' })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  @ApiConflictResponse({ description: 'Only abandoned carts can be deleted' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cartsService.removeByAdmin(id);
  }
}
