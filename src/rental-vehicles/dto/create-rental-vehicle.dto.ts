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
} from '../rental-vehicle.entity';

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
    description: 'Vehicle information definition id',
    example: 5,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  vehicleInformationId?: number;

  @ApiPropertyOptional({
    description: 'Vehicle type when no vehicleInformationId provided',
  })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({
    description: 'Vehicle brand when no vehicleInformationId provided',
  })
  @IsOptional()
  @IsString()
  vehicleBrand?: string;

  @ApiPropertyOptional({
    description: 'Vehicle model when no vehicleInformationId provided',
  })
  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @ApiPropertyOptional({
    description: 'Vehicle color when no vehicleInformationId provided',
  })
  @IsOptional()
  @IsString()
  vehicleColor?: string;

  @ApiPropertyOptional({ description: 'Manufacture year', example: '2022' })
  @IsOptional()
  @IsString()
  manufactureYear?: string;

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

  @ApiPropertyOptional({ description: 'Vehicle registration front photo url' })
  @IsOptional()
  @IsString()
  vehicleRegistrationFront?: string;

  @ApiPropertyOptional({ description: 'Vehicle registration back photo url' })
  @IsOptional()
  @IsString()
  vehicleRegistrationBack?: string;

  @ApiPropertyOptional({ description: 'Gallery photo urls', type: [String] })
  @IsOptional()
  @IsString({ each: true })
  photoUrls?: string[];

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

  @ApiPropertyOptional({ description: 'Legacy identifier from Firebase' })
  @IsOptional()
  @IsString()
  externalId?: string;
}
