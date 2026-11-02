import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShipmentAddressResponse {
  @ApiProperty() name!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() addressLine1!: string;
  @ApiPropertyOptional({ nullable: true }) addressLine2!: string | null;
  @ApiProperty() city!: string;
  @ApiPropertyOptional({ nullable: true }) state!: string | null;
  @ApiPropertyOptional({ nullable: true }) postalCode!: string | null;
  @ApiProperty() country!: string;
}

export class ShipmentResponse {
  @ApiProperty() id!: number;
  @ApiProperty() orderId!: number;
  @ApiProperty({ example: 'PROCESSING' }) status!: string;
  @ApiProperty({ example: 'SHIPPED' }) orderStatus!: string;
  @ApiPropertyOptional({ nullable: true }) carrier!: string | null;
  @ApiPropertyOptional({ nullable: true }) trackingNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) shippedAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) deliveredAt!: string | null;
  @ApiProperty({ type: ShipmentAddressResponse })
  shippingAddress!: ShipmentAddressResponse;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class PaginatedShipmentsResponse {
  @ApiProperty({ type: [ShipmentResponse] }) items!: ShipmentResponse[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
