import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransformDDMMYYYY } from '../../../common/utils/date.util';
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

export class CreateRentalBillDto {
  @ApiProperty({ enum: RentalBillType, example: RentalBillType.DAILY })
  @IsEnum(RentalBillType)
  @IsNotEmpty()
  rentalType: RentalBillType;

  @ApiProperty({ description: 'Ngày bắt đầu (dd/MM/yyyy)', example: '25/12/2024' })
  @TransformDDMMYYYY()
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({ description: 'Ngày kết thúc (dd/MM/yyyy)', example: '27/12/2024' })
  @TransformDDMMYYYY()
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

  @ApiPropertyOptional({ description: 'Mã giảm giá' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({ description: 'Số điểm TravelPoint muốn sử dụng' })
  @IsOptional()
  @Type(() => Number)
  travelPointsUsed?: number;
}
