import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRentalVehicleDto {
  // Base prices
  @ApiPropertyOptional({ description: 'Rental price per hour' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerHour?: number;

  @ApiPropertyOptional({ description: 'Rental price per day' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerDay?: number;

  // Hourly packages
  @ApiPropertyOptional({ description: 'Price for 4-hour package' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceFor4Hours?: number;

  @ApiPropertyOptional({ description: 'Price for 8-hour package' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceFor8Hours?: number;

  @ApiPropertyOptional({ description: 'Price for 12-hour package' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceFor12Hours?: number;

  // Daily packages
  @ApiPropertyOptional({ description: 'Price for 2-day package' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceFor2Days?: number;

  @ApiPropertyOptional({ description: 'Price for 3-day package' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceFor3Days?: number;

  @ApiPropertyOptional({ description: 'Price for 5-day package' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceFor5Days?: number;

  @ApiPropertyOptional({ description: 'Price for 7-day package' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceFor7Days?: number;

  @ApiPropertyOptional({
    description: 'Rental requirements shown to customers',
  })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional({ description: 'Vehicle description' })
  @IsOptional()
  @IsString()
  description?: string;
}
