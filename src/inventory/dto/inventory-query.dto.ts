import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';

export class InventoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by product variant ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId?: number;
}
