import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { HotelBillStatus } from '../hotel-bill.entity';
import { HotelBillRoomDto } from './hotel-bill-room.dto';

export class CreateHotelBillDto {
  @ApiProperty({ description: 'User id that places the booking' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ description: 'Check-in date (ISO string)' })
  @IsDateString()
  checkInDate: string;

  @ApiProperty({ description: 'Check-out date (ISO string)' })
  @IsDateString()
  checkOutDate: string;

  @ApiProperty({ description: 'Rooms to reserve', type: [HotelBillRoomDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HotelBillRoomDto)
  rooms: HotelBillRoomDto[];

  @ApiPropertyOptional({ description: 'Preferred payment method' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Contact name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Voucher code to apply' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({
    description: 'Travel points used for discount',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  travelPointsUsed?: number;

  @ApiPropertyOptional({
    enum: HotelBillStatus,
    description: 'Initial status override',
  })
  @IsOptional()
  @IsEnum(HotelBillStatus)
  status?: HotelBillStatus;

  @ApiPropertyOptional({ description: 'Reason for manual status override' })
  @IsOptional()
  @IsString()
  statusReason?: string;

  @ApiPropertyOptional({ description: 'Override total amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalOverride?: number;
}
