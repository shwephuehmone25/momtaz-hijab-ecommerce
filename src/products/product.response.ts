import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductVariantResponse } from '../product-variants/product-variant.response';
import { ProductStatus } from './dto';

export class ProductImageResponse {
  @ApiProperty() id!: number;
  @ApiProperty() productId!: number;
  @ApiProperty() imageUrl!: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() createdAt!: Date;
}

export class ProductResponse {
  @ApiProperty() id!: number;
  @ApiProperty() categoryId!: number;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ enum: ProductStatus }) status!: ProductStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ProductDetailResponse extends ProductResponse {
  @ApiProperty({ type: [ProductVariantResponse] })
  variants!: ProductVariantResponse[];
  @ApiProperty({ type: [ProductImageResponse] })
  images!: ProductImageResponse[];
}

export class PaginatedProductsResponse {
  @ApiProperty({ type: [ProductResponse] }) items!: ProductResponse[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
