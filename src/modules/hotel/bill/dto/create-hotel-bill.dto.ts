import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { HotelBillRoomDto } from './hotel-bill-room.dto';

export class CreateHotelBillDto {
  @ApiProperty({ description: 'Check-in date (ISO or dd:MM:yyyy HH:mm)', example: '25:12:2024 14:00' })
  @IsString()
  @IsNotEmpty()
  checkInDate: string;

  @ApiProperty({ description: 'Check-out date (ISO or dd:MM:yyyy HH:mm)', example: '27:12:2024 12:00' })
  @IsString()
  @IsNotEmpty()
  checkOutDate: string;

  @ApiProperty({ description: 'Rooms to reserve', type: [HotelBillRoomDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HotelBillRoomDto)
  rooms: HotelBillRoomDto[];

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
  travelPointsUsed?: number;
}
