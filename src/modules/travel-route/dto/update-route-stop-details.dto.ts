import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Min, IsInt } from 'class-validator';

export class UpdateRouteStopDetailsDto {
  @ApiPropertyOptional({ description: 'Ghi chú bổ sung' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Cập nhật địa điểm đã chọn', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationId?: number;
}
