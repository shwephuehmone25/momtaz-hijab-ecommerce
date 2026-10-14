import { ApiProperty } from '@nestjs/swagger';

export class AdminOrderResponse {
  @ApiProperty() id!: number;
  @ApiProperty({ example: '1001' }) order_key!: string;
  @ApiProperty() customer_id!: number;
  @ApiProperty({ example: 'PENDING' }) order_status!: string;
  @ApiProperty({ example: 'PAID' }) payment_status!: string;
  @ApiProperty({ example: 89.9 }) order_total!: number;
  @ApiProperty() created_at!: string;
}

export class OrderItemResponse {
  @ApiProperty() id!: number;
  @ApiProperty() variantId!: number;
  @ApiProperty() productName!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty({ example: '29.95' }) unitPrice!: string;
  @ApiProperty({ example: '59.90' }) totalPrice!: string;
}

export class OrderDetailResponse {
  @ApiProperty() id!: number;
  @ApiProperty() customerId!: number;
  @ApiProperty({ example: 'PENDING' }) status!: string;
  @ApiProperty({ example: '59.90' }) subtotal!: string;
  @ApiProperty({ example: '0.00' }) shippingFee!: string;
  @ApiProperty({ example: '0.00' }) discountAmount!: string;
  @ApiProperty({ example: '59.90' }) total!: string;
  @ApiProperty({ type: [OrderItemResponse] }) items!: OrderItemResponse[];
  @ApiProperty({ type: [Object] }) payments!: object[];
  @ApiProperty({ type: [Object] }) shipments!: object[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class OrdersPaginationResponse {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class PaginatedOrdersResponse {
  @ApiProperty({ type: [AdminOrderResponse] }) items!: AdminOrderResponse[];
  @ApiProperty({ type: OrdersPaginationResponse })
  pagination!: OrdersPaginationResponse;
}
