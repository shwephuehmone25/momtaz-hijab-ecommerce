import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicProductImageResponse {
  @ApiProperty() id!: number;
  @ApiProperty() imageUrl!: string;
  @ApiProperty() sortOrder!: number;
}

export class PublicProductCategoryResponse {
  @ApiProperty() id!: number;
  @ApiPropertyOptional({ nullable: true }) parentId!: number | null;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;
}

export class PublicProductVariantResponse {
  @ApiProperty() id!: number;
  @ApiProperty() sku!: string;
  @ApiPropertyOptional({ nullable: true }) color!: string | null;
  @ApiPropertyOptional({ nullable: true }) style!: string | null;
  @ApiPropertyOptional({ nullable: true }) size!: string | null;
  @ApiProperty({ example: '29.99' }) price!: string;
  @ApiPropertyOptional({ example: '39.99', nullable: true })
  compareAtPrice!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ minimum: 0 }) stock!: number;
  @ApiProperty({ minimum: 0 }) availableQuantity!: number;
  @ApiProperty() inStock!: boolean;
}

export class PublicProductResponse {
  @ApiProperty() id!: number;
  @ApiProperty({ description: 'Storefront route identifier' }) slug!: string;
  @ApiProperty() categoryId!: number;
  @ApiProperty({ description: 'Storefront category label' }) category!: string;
  @ApiProperty({ type: PublicProductCategoryResponse })
  categoryDetails!: PublicProductCategoryResponse;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ example: 29.99 }) price!: number;
  @ApiPropertyOptional({ example: 39.99, nullable: true })
  originalPrice!: number | null;
  @ApiPropertyOptional({ nullable: true }) image!: string | null;
  @ApiProperty({ type: [String] }) gallery!: string[];
  @ApiProperty({ example: 4.8 }) rating!: number;
  @ApiProperty({ minimum: 0 }) reviews!: number;
  @ApiProperty() isNew!: boolean;
  @ApiProperty() isBestSeller!: boolean;
  @ApiPropertyOptional({ minimum: 0, nullable: true })
  bestSellerOrder!: number | null;
  @ApiProperty({ minimum: 0 }) availableQuantity!: number;
  @ApiProperty() inStock!: boolean;
  @ApiProperty({ type: [PublicProductImageResponse] })
  images!: PublicProductImageResponse[];
  @ApiProperty({ type: [PublicProductVariantResponse] })
  variants!: PublicProductVariantResponse[];
}

export class PaginatedPublicProductsResponse {
  @ApiProperty({ type: [PublicProductResponse] })
  items!: PublicProductResponse[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
