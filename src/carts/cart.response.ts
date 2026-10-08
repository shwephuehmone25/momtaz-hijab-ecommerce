import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CartStatus } from './dto';

export class CartProductResponse {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
}

export class CartProductVariantResponse {
  @ApiProperty() id!: number;
  @ApiProperty() sku!: string;
  @ApiPropertyOptional({ nullable: true }) color!: string | null;
  @ApiPropertyOptional({ nullable: true }) style!: string | null;
  @ApiPropertyOptional({ nullable: true }) size!: string | null;
  @ApiProperty({ type: CartProductResponse }) product!: CartProductResponse;
}

export class CartItemResponse {
  @ApiProperty() id!: number;
  @ApiProperty() productVariantId!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty({ example: '29.99' }) unitPrice!: string;
  @ApiProperty({ example: '59.98' }) lineTotal!: string;
  @ApiProperty({ type: CartProductVariantResponse })
  productVariant!: CartProductVariantResponse;
}

export class CartResponse {
  @ApiProperty({ nullable: true }) id!: number | null;
  @ApiProperty() customerId!: number;
  @ApiProperty({ enum: CartStatus }) status!: CartStatus;
  @ApiProperty({ type: [CartItemResponse] }) items!: CartItemResponse[];
  @ApiProperty() totalQuantity!: number;
  @ApiProperty({ example: '59.98' }) subtotal!: string;
  @ApiPropertyOptional({ nullable: true }) createdAt!: object | null;
  @ApiPropertyOptional({ nullable: true }) updatedAt!: object | null;
}

export class PaginatedCartsResponse {
  @ApiProperty({ type: [CartResponse] }) items!: CartResponse[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
