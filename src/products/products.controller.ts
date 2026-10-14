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
import { CreateProductDto, ProductsQueryDto, UpdateProductDto } from './dto';
import {
  PaginatedProductsResponse,
  ProductDetailResponse,
  ProductResponse,
} from './product.response';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('api/v1/admin/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiCreatedResponse({ type: ProductDetailResponse })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Invalid variant or stock data' })
  @ApiConflictResponse({ description: 'Duplicate variant SKU' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List products' })
  @ApiOkResponse({ type: PaginatedProductsResponse })
  findAll(@Query() query: ProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product' })
  @ApiOkResponse({ type: ProductDetailResponse })
  @ApiNotFoundResponse({ description: 'Product not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiOkResponse({ type: ProductDetailResponse })
  @ApiNotFoundResponse({ description: 'Product or category not found' })
  @ApiBadRequestResponse({
    description: 'Invalid variant synchronization data',
  })
  @ApiConflictResponse({
    description: 'Duplicate SKU or a removed variant is still referenced',
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiOkResponse({ description: 'Product deleted' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
