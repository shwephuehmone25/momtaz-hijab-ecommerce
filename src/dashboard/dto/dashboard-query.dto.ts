import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum DashboardRange {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
}

export enum DashboardPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class DashboardQueryDto {
  @ApiPropertyOptional({
    enum: DashboardRange,
    default: DashboardRange.SEVEN_DAYS,
  })
  @IsOptional()
  @IsEnum(DashboardRange)
  range?: DashboardRange;

  @ApiPropertyOptional({ enum: DashboardPeriod })
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod;
}

export class TopProductsQueryDto extends DashboardQueryDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}
