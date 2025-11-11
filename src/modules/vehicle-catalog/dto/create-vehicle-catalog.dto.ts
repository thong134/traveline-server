import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVehicleCatalogDto {
  @ApiProperty({ description: 'Vehicle type name (e.g. Ô tô, Xe máy)' })
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
}
