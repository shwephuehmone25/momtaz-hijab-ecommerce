import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Chiffon Hijabs' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    example: 'https://example.com/chiffon.jpg',
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  imageUrl?: string | null;

  @ApiPropertyOptional({ description: 'Parent category ID', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number | null;
}
