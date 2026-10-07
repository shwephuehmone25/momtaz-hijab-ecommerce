import { ApiProperty } from '@nestjs/swagger';

export class InventoryResponse {
  @ApiProperty() id!: number;
  @ApiProperty() variantId!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty() reservedQuantity!: number;
  @ApiProperty({ description: 'Computed quantity minus reserved quantity' })
  availableQuantity!: number;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedInventoryResponse {
  @ApiProperty({ type: [InventoryResponse] }) items!: InventoryResponse[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
