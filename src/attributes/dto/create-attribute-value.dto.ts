import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAttributeValueDto {
  @ApiProperty({ example: 'Black' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  value!: string;

  @ApiPropertyOptional({ name: 'order_by', default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_by?: number;
}
