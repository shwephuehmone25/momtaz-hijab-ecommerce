import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PublicProductsQueryDto } from './dto';
import {
  PaginatedPublicProductsResponse,
  PublicProductResponse,
} from './public-product.response';
import { ProductsService } from './products.service';

@ApiTags('Storefront Products')
@Controller('api/v1/products')
export class PublicProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Browse and search publicly available products',
  })
  @ApiOkResponse({ type: PaginatedPublicProductsResponse })
  findAll(@Query() query: PublicProductsQueryDto) {
    return this.productsService.findPublic(query);
  }

  @Get('best-sellers')
  @ApiOperation({ summary: 'Browse visible best-selling products' })
  @ApiOkResponse({ type: PaginatedPublicProductsResponse })
  findBestSellers(@Query() query: PublicProductsQueryDto) {
    return this.productsService.findPublicBestSellers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a publicly available product' })
  @ApiOkResponse({ type: PublicProductResponse })
  @ApiNotFoundResponse({ description: 'Product not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findPublicOne(id);
  }
}
