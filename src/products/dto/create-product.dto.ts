import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductStatus } from './product-status';

export class CreateProductDto {
  @ApiProperty({ description: 'Category ID' })
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ApiProperty({ example: 'Luxury Chiffon Hijab' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
