import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from '../entities/rental-vehicle.entity';

export class UpdateRentalVehicleStatusDto {
  @ApiProperty({
    enum: RentalVehicleApprovalStatus,
    description: 'Trạng thái phê duyệt mới của xe',
  })
  @IsEnum(RentalVehicleApprovalStatus)
  status: RentalVehicleApprovalStatus;

  @ApiPropertyOptional({
    enum: RentalVehicleAvailabilityStatus,
    description: 'Cập nhật tình trạng sẵn sàng của xe',
  })
  @IsOptional()
  @IsEnum(RentalVehicleAvailabilityStatus)
  availability?: RentalVehicleAvailabilityStatus;

  @ApiPropertyOptional({ description: 'Lý do từ chối nếu có' })
  @IsOptional()
  @IsString()
  rejectedReason?: string;
}

export class RejectRentalVehicleDto {
  @ApiProperty({ description: 'Lý do từ chối xe cho thuê' })
  @IsString()
  @IsNotEmpty()
  rejectedReason: string;
}
