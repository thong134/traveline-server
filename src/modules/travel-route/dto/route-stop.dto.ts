import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { RouteStopStatus } from '../entities/route-stop.entity';

export class RouteStopDto {
  @ApiProperty({
    description: 'Day order within the route (1 = first day)',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayOrder: number;

  @ApiProperty({ description: 'Sequence order within the day', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence: number;

  @ApiPropertyOptional({ description: 'Internal destination id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationId?: number;

  @ApiPropertyOptional({ enum: RouteStopStatus })
  @IsOptional()
  @IsEnum(RouteStopStatus)
  status?: RouteStopStatus;

  @ApiPropertyOptional({ description: 'Travel points awarded', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  travelPoints?: number;

  @ApiPropertyOptional({ description: 'Start time in HH:mm format' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time in HH:mm format' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
