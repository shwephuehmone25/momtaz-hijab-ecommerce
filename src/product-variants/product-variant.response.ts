import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '../products/dto';

export class ProductVariantResponse {
  @ApiProperty() id!: number;
  @ApiProperty() productId!: number;
  @ApiProperty() sku!: string;
  @ApiPropertyOptional({ nullable: true }) color!: string | null;
  @ApiPropertyOptional({ nullable: true }) style!: string | null;
  @ApiPropertyOptional({ nullable: true }) size!: string | null;
  @ApiProperty({ example: '29.99' }) price!: string;
  @ApiPropertyOptional({ example: '39.99', nullable: true })
  compareAtPrice!: string | null;
  @ApiProperty({ enum: ProductStatus }) status!: ProductStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedProductVariantsResponse {
  @ApiProperty({ type: [ProductVariantResponse] })
  items!: ProductVariantResponse[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
