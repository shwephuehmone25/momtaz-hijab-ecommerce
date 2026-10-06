import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressResponse {
  @ApiProperty() id!: number;
  @ApiProperty() customerId!: number;
  @ApiProperty() addressLine1!: string;
  @ApiPropertyOptional({ nullable: true }) addressLine2!: string | null;
  @ApiProperty() city!: string;
  @ApiPropertyOptional({ nullable: true }) state!: string | null;
  @ApiPropertyOptional({ nullable: true }) postalCode!: string | null;
  @ApiProperty() country!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedAddressesResponse {
  @ApiProperty({ type: [AddressResponse] }) items!: AddressResponse[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
