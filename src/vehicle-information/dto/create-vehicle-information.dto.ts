import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVehicleInformationDto {
  @ApiProperty({
    description: 'Vehicle type name (e.g. Ô tô, Xe máy, Delivery)',
  })
  @IsString()
  @MinLength(1)
  type: string;

  @ApiProperty({ description: 'Vehicle brand' })
  @IsString()
  @MinLength(1)
  brand: string;

  @ApiProperty({ description: 'Vehicle model name' })
  @IsString()
  @MinLength(1)
  model: string;

  @ApiProperty({ description: 'Vehicle color' })
  @IsString()
  @MinLength(1)
  color: string;

  @ApiPropertyOptional({
    description: 'Legacy vehicle identifier from Firebase',
  })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ description: 'Number of seats', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  seatingCapacity?: number;

  @ApiPropertyOptional({ description: 'Fuel type' })
  @IsOptional()
  @IsString()
  fuelType?: string;

  @ApiPropertyOptional({ description: 'Maximum speed string (e.g. 180km/h)' })
  @IsOptional()
  @IsString()
  maxSpeed?: string;

  @ApiPropertyOptional({ description: 'Transmission type' })
  @IsOptional()
  @IsString()
  transmission?: string;

  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional()
  @IsUrl()
  photo?: string;

  @ApiPropertyOptional({ description: 'Rich description for landing pages' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Default requirement bullet list',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultRequirements?: string[];

  @ApiPropertyOptional({
    description: 'Suggested hourly price',
    example: 80000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  defaultPricePerHour?: number;

  @ApiPropertyOptional({
    description: 'Suggested daily price',
    example: 650000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  defaultPricePerDay?: number;

  @ApiPropertyOptional({
    description: 'Whether the vehicle definition is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
