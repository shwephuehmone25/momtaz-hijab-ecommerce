import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAttributeDto {
  @ApiProperty({ example: 'Color' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'color' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must contain lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({ enum: ['select', 'color', 'input'], default: 'select' })
  @IsOptional()
  @IsString()
  @IsIn(['select', 'color', 'input'])
  type?: string;

  @ApiPropertyOptional({ name: 'order_by', default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_by?: number;
}
