import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';

const MONEY_PATTERN = /^\d{1,8}(?:\.\d{1,2})?$/;

export enum PublicProductSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
}

export class PublicProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search product names and descriptions',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Minimum active variant price' })
  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  minPrice?: string;

  @ApiPropertyOptional({ description: 'Maximum active variant price' })
  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  maxPrice?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  style?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  size?: string;

  @ApiPropertyOptional({
    enum: PublicProductSort,
    default: PublicProductSort.NEWEST,
  })
  @IsOptional()
  @IsEnum(PublicProductSort)
  sort = PublicProductSort.NEWEST;
}
