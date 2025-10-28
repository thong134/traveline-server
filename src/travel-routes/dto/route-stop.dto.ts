import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
} from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Legacy destination external id' })
  @IsOptional()
  @IsString()
  destinationExternalId?: string;

  @ApiPropertyOptional({ description: 'Unique key from client' })
  @IsOptional()
  @IsString()
  uniqueKey?: string;

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

  @ApiPropertyOptional({ description: 'Photo URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl(undefined, { each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Video URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl(undefined, { each: true })
  videos?: string[];
}
