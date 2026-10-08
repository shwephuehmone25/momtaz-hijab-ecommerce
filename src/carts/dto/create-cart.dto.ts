import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { CartStatus } from './cart-status';

export class CreateCartDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsInt()
  @Min(1)
  customerId!: number;

  @ApiPropertyOptional({ enum: CartStatus, default: CartStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CartStatus)
  status?: CartStatus;
}
