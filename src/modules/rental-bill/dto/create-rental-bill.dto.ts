import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
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

  @ApiProperty({ description: 'Ngày bắt đầu (ISO 8601)', example: '2024-12-25T08:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Ngày kết thúc (ISO 8601)', example: '2024-12-27T18:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

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
