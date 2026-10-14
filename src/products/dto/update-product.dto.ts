import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductVariantInputDto } from './product-variant-input.dto';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants'] as const),
) {
  @ApiPropertyOptional({
    type: [UpdateProductVariantInputDto],
    description:
      'Complete desired variant set. Existing IDs are updated, missing IDs are removed, and entries without IDs are created.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantInputDto)
  variants?: UpdateProductVariantInputDto[];
}
