import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class BusBillSeatDto {
  @ApiProperty({ description: 'Seat number' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatNumber: number;

  @ApiProperty({ description: 'Seat price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  total: number;
}
