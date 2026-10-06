import { ApiProperty } from '@nestjs/swagger';

export class CategoryImageResponse {
  @ApiProperty({
    example: 'https://assets.example.com/categories/example.webp',
  })
  url!: string;

  @ApiProperty({ example: 'categories/abc123.webp' })
  key!: string;

  @ApiProperty({ example: 'image/webp' })
  contentType!: string;

  @ApiProperty() bytes!: number;
}
