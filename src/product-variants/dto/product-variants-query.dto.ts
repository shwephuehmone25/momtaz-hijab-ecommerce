import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';
import { ProductStatus } from '../../products/dto';

export class ProductVariantsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by product ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId?: number;

  @ApiPropertyOptional({ description: 'Search by SKU', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
