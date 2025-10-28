import { PartialType } from '@nestjs/swagger';
import { CreateHotelBillDto } from './create-hotel-bill.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { HotelBillRoomDto } from './hotel-bill-room.dto';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

export class UpdateHotelBillDto extends PartialType(CreateHotelBillDto) {
  @ApiPropertyOptional({
    description: 'Replace booked rooms',
    type: [HotelBillRoomDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HotelBillRoomDto)
  rooms?: HotelBillRoomDto[];
}
