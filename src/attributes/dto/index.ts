import { PartialType } from '@nestjs/swagger';
import { CreateAttributeDto } from './create-attribute.dto';
import { CreateAttributeValueDto } from './create-attribute-value.dto';

export class UpdateAttributeDto extends PartialType(CreateAttributeDto) {}
export class UpdateAttributeValueDto extends PartialType(CreateAttributeValueDto) {}

export * from './create-attribute.dto';
export * from './create-attribute-value.dto';
