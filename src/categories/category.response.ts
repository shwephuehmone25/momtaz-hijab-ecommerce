import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponse {
  @ApiProperty() id!: number;
  @ApiPropertyOptional({ nullable: true }) parentId!: number | null;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedCategoriesResponse {
  @ApiProperty({ type: [CategoryResponse] }) items!: CategoryResponse[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}
