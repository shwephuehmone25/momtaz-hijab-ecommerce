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
import {
  CreateProductVariantDto,
  ProductVariantsQueryDto,
  UpdateProductVariantDto,
} from './dto';
import {
  PaginatedProductVariantsResponse,
  ProductVariantResponse,
} from './product-variant.response';
import { ProductVariantsService } from './product-variants.service';

@ApiTags('Product Variants')
@Controller('api/v1/admin/product-variants')
export class ProductVariantsController {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a product variant' })
  @ApiCreatedResponse({ type: ProductVariantResponse })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiConflictResponse({ description: 'SKU already exists' })
  create(@Body() dto: CreateProductVariantDto) {
    return this.productVariantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List product variants' })
  @ApiOkResponse({ type: PaginatedProductVariantsResponse })
  findAll(@Query() query: ProductVariantsQueryDto) {
    return this.productVariantsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product variant' })
  @ApiOkResponse({ type: ProductVariantResponse })
  @ApiNotFoundResponse({ description: 'Product variant not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productVariantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product variant' })
  @ApiOkResponse({ type: ProductVariantResponse })
  @ApiNotFoundResponse({ description: 'Product variant or product not found' })
  @ApiConflictResponse({ description: 'SKU already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productVariantsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product variant' })
  @ApiOkResponse({ description: 'Product variant deleted' })
  @ApiNotFoundResponse({ description: 'Product variant not found' })
  @ApiConflictResponse({
    description: 'Variant is referenced by a cart or order',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productVariantsService.remove(id);
  }
}
