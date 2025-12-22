import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRentalVehicleDto {
  @ApiProperty({ description: 'License plate number', example: '47L7-7886' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9\-\s]+$/)
  @MaxLength(32)
  licensePlate: string;

  @ApiProperty({ description: 'Contract id owner', example: 1 })
  @Type(() => Number)
  @IsInt()
  contractId: number;

  @ApiProperty({
    description: 'Vehicle catalog definition id',
    example: 5,
  })
  @Type(() => Number)
  @IsInt()
  vehicleCatalogId: number;

  @ApiProperty({ description: 'Rental price per hour', example: 80000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerHour: number;

  @ApiProperty({ description: 'Rental price per day', example: 650000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerDay: number;

  // Hourly packages (optional)
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

  // Daily packages (optional)
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

  @ApiPropertyOptional({
    description: 'Vehicle registration front photo (file upload field)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  vehicleRegistrationFront?: string;

  @ApiPropertyOptional({
    description: 'Vehicle registration back photo (file upload field)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  vehicleRegistrationBack?: string;
}
