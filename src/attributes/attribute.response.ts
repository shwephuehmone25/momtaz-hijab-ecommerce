import { ApiProperty } from '@nestjs/swagger';

export class AttributeValueResponse {
  @ApiProperty() id!: number;
  @ApiProperty({ name: 'attribute_id' }) attribute_id!: number;
  @ApiProperty() value!: string;
  @ApiProperty({ name: 'order_by' }) order_by!: number;
}

export class AttributeResponse {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: ['select', 'color', 'input'] }) type!: string;
  @ApiProperty({ name: 'order_by' }) order_by!: number;
  @ApiProperty({ name: 'created_at' }) created_at!: Date;
  @ApiProperty({ name: 'updated_at' }) updated_at!: Date;
}

export class AttributeDetailResponse extends AttributeResponse {
  @ApiProperty({ type: [AttributeValueResponse] }) values!: AttributeValueResponse[];
}
