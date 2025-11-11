import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RouteStopDto } from './route-stop.dto';

export class CreateTravelRouteDto {
  @ApiProperty({ description: 'Route name' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: 'Owner user id (internal)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({ description: 'Owner Firebase UID' })
  @IsOptional()
  @IsString()
  ownerUid?: string;

  @ApiPropertyOptional({ description: 'Province name' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Number of days in route' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfDays?: number;

  @ApiPropertyOptional({ description: 'Route start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Route end date (ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'List of stops grouped by day',
    type: [RouteStopDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  stops?: RouteStopDto[];
}
