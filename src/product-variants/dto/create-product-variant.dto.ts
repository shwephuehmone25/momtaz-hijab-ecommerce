import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductStatus } from '../../products/dto';

const MONEY_PATTERN = /^\d{1,8}(?:\.\d{1,2})?$/;

export class CreateProductVariantDto {
  @ApiProperty({ description: 'Product ID' })
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiProperty({ example: 'CHIFFON-BLK-M' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku!: string;

  @ApiPropertyOptional({ example: 'Black', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string | null;

  @ApiPropertyOptional({ example: 'Classic', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  style?: string | null;

  @ApiPropertyOptional({ example: 'M', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  size?: string | null;

  @ApiProperty({
    example: '29.99',
    description: 'Decimal string with up to 2 places',
  })
  @IsString()
  @Matches(MONEY_PATTERN, {
    message:
      'price must be a non-negative decimal with up to 8 integer and 2 decimal digits',
  })
  price!: string;

  @ApiPropertyOptional({ example: '39.99', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN, {
    message:
      'compareAtPrice must be a non-negative decimal with up to 8 integer and 2 decimal digits',
  })
  compareAtPrice?: string | null;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
