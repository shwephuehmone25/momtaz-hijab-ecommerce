import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';
import { CartStatus } from './cart-status';

export class CartsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId?: number;

  @ApiPropertyOptional({ enum: CartStatus })
  @IsOptional()
  @IsEnum(CartStatus)
  status?: CartStatus;
}
