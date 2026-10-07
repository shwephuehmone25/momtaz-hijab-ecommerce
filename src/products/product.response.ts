import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from './dto';

export class ProductResponse {
  @ApiProperty() id!: number;
  @ApiProperty() categoryId!: number;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ enum: ProductStatus }) status!: ProductStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedProductsResponse {
  @ApiProperty({ type: [ProductResponse] }) items!: ProductResponse[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
