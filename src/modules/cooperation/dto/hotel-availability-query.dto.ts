import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class HotelAvailabilityQueryDto {
  @ApiProperty({
    example: '2025-12-01',
    description: 'Ngày check-in (ISO 8601)',
  })
  @IsDateString()
  checkIn: string;

  @ApiProperty({
    example: '2025-12-05',
    description: 'Ngày check-out (ISO 8601)',
  })
  @IsDateString()
  checkOut: string;

  @ApiProperty({ required: false, minimum: 1, example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rooms?: number;

  @ApiProperty({ required: false, minimum: 1, example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests?: number;
}
