import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class HotelBillRoomDto {
  @ApiProperty({ description: 'Room id to reserve' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId: number;

  @ApiPropertyOptional({
    description: 'Number of rooms to reserve',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Override price per night if needed' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  priceOverride?: number;
}
