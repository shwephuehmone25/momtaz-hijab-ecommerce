import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';

export class CustomersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search customers by name, email, or phone',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
