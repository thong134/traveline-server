import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, IsOptional } from 'class-validator';

export class ReorderRouteStopDto {
  @ApiPropertyOptional({ description: 'Ngày mới trong hành trình', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayOrder?: number;

  @ApiProperty({ description: 'Thứ tự mới trong ngày', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence: number;
}
