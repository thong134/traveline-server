import { ApiPropertyOptional } from '@nestjs/swagger';
import { Matches, IsOptional } from 'class-validator';

export class UpdateRouteStopTimeDto {
  @ApiPropertyOptional({ description: 'Thời gian bắt đầu (HH:mm)' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @ApiPropertyOptional({ description: 'Thời gian kết thúc (HH:mm)' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;
}
