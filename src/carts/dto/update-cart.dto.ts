import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { CartStatus } from './cart-status';

export class UpdateCartDto {
  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @ApiPropertyOptional({ enum: CartStatus })
  @IsOptional()
  @IsEnum(CartStatus)
  status?: CartStatus;
}
