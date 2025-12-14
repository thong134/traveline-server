import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
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

  @ApiPropertyOptional({
    description: 'Đặt true nếu muốn chia sẻ lộ trình cho người khác sử dụng',
  })
  @IsOptional()
  @IsBoolean()
  shared?: boolean;

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
  @IsString()
  @Matches(/^(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/, {
    message: 'startDate phải ở định dạng dd/MM/yyyy hoặc yyyy-MM-dd',
  })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Route end date (ISO string)' })
  @IsOptional()
  @IsString()
  @Matches(/^(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/, {
    message: 'endDate phải ở định dạng dd/MM/yyyy hoặc yyyy-MM-dd',
  })
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
