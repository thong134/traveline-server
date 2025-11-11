import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class HotelBillRoomDto {
  @ApiProperty({ description: 'Room identifier' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  roomId: number;

  @ApiProperty({ description: 'Number of rooms to book', default: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;
}
