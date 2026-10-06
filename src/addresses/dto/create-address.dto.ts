import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'No. 42, Inya Road' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine1!: string;

  @ApiPropertyOptional({ example: 'Apartment 3B', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string | null;

  @ApiProperty({ example: 'Yangon' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional({ example: 'Yangon Region', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string | null;

  @ApiPropertyOptional({ example: '11041', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string | null;

  @ApiProperty({ example: 'Myanmar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country!: string;
}
