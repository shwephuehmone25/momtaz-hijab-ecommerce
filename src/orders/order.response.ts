import { ApiProperty } from '@nestjs/swagger';

export class AdminOrderResponse {
  @ApiProperty() id!: number;
  @ApiProperty({ example: '1001' }) order_key!: string;
  @ApiProperty({ example: 'PENDING' }) order_status!: string;
  @ApiProperty({ example: 'PAID' }) payment_status!: string;
  @ApiProperty({ example: 89.9 }) order_total!: number;
  @ApiProperty() created_at!: string;
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
