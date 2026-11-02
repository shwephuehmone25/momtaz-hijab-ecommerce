import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ShipmentStatus } from './shipment-status';

export class UpdateShipmentDto {
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

  @ApiPropertyOptional({ enum: ShipmentStatus })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  shippedAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  deliveredAt?: string | null;
}
