import { PartialType } from '@nestjs/swagger';
import { CreateRentalVehicleDto } from './create-rental-vehicle.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from '../rental-vehicle.entity';

export class UpdateRentalVehicleDto extends PartialType(
  CreateRentalVehicleDto,
) {
  @ApiPropertyOptional({ enum: RentalVehicleApprovalStatus })
  @IsOptional()
  @IsEnum(RentalVehicleApprovalStatus)
  status?: RentalVehicleApprovalStatus;

  @ApiPropertyOptional({
    description: 'Admin reason for rejecting the vehicle',
  })
  @IsOptional()
  @IsString()
  rejectedReason?: string;

  @ApiPropertyOptional({ enum: RentalVehicleAvailabilityStatus })
  @IsOptional()
  @IsEnum(RentalVehicleAvailabilityStatus)
  availability?: RentalVehicleAvailabilityStatus;
}
