import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ description: 'Product variant ID' })
  @IsInt()
  @Min(1)
  productVariantId!: number;

  @ApiProperty({ default: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
