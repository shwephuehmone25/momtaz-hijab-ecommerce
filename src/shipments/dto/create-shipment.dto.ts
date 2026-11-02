import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ShipmentStatus } from './shipment-status';

export class CreateShipmentDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId!: number;

  @ApiPropertyOptional({ example: 'DHL' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  carrier?: string | null;

  @ApiPropertyOptional({ example: 'DHL-123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string | null;

  @ApiPropertyOptional({
    enum: ShipmentStatus,
    default: ShipmentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional({ example: '2026-10-14T08:00:00Z' })
  @IsOptional()
  @IsDateString()
  shippedAt?: string | null;

  @ApiPropertyOptional({ example: '2026-10-16T08:00:00Z' })
  @IsOptional()
  @IsDateString()
  deliveredAt?: string | null;
}
