import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from '../entities/rental-vehicle.entity';

export class CreateRentalVehicleDto {
  @ApiProperty({ description: 'License plate number', example: '47L7-7886' })
  @IsString()
  @Matches(/^[A-Za-z0-9\-\s]+$/)
  @MaxLength(32)
  licensePlate: string;

  @ApiProperty({ description: 'Contract id owner', example: 1 })
  @Type(() => Number)
  @IsInt()
  contractId: number;

  @ApiPropertyOptional({
    description: 'Vehicle catalog definition id',
    example: 5,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  vehicleCatalogId?: number;

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
    enum: RentalVehicleApprovalStatus,
    description: 'Optional manual status override',
  })
  @IsOptional()
  @IsEnum(RentalVehicleApprovalStatus)
  status?: RentalVehicleApprovalStatus;

  @ApiPropertyOptional({ enum: RentalVehicleAvailabilityStatus })
  @IsOptional()
  @IsEnum(RentalVehicleAvailabilityStatus)
  availability?: RentalVehicleAvailabilityStatus;
}
