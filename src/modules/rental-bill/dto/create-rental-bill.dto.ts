import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransformDDMMYYYY, TransformDDMMYYYYHHmm } from '../../../common/utils/date.util';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { RentalBillType } from '../entities/rental-bill.entity';
import { RentalBillDetailDto } from './rental-bill-detail.dto';
import { RentalVehicleType } from '../../rental-vehicle/entities/rental-vehicle.entity';

export class CreateRentalBillDto {
  @ApiProperty({ enum: RentalBillType, example: RentalBillType.DAILY })
  @IsNotEmpty()
  rentalType: RentalBillType;

  @ApiProperty({ enum: RentalVehicleType, example: RentalVehicleType.BIKE })
  @IsEnum(RentalVehicleType)
  @IsNotEmpty()
  vehicleType: RentalVehicleType;

  @ApiProperty({ description: 'Gói thuê (1h, 4h, 8h, 12h, 1d, 2d, 3d, 5d, 7d)', example: '4h' })
  @IsString()
  @IsNotEmpty()
  durationPackage: string;

  @ApiProperty({ description: 'Ngày bắt đầu (dd/MM/yyyy HH:mm)', example: '25/12/2024 08:00' })
  @TransformDDMMYYYYHHmm()
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({ description: 'Ngày kết thúc (dd/MM/yyyy HH:mm)', example: '25/12/2024 12:00' })
  @TransformDDMMYYYYHHmm()
  @IsDate()
  @IsNotEmpty()
  endDate: Date;

  @ApiPropertyOptional({ description: 'Địa chỉ nhận xe' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ type: [RentalBillDetailDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalBillDetailDto)
  details: RentalBillDetailDto[];
}
