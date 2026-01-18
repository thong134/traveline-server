import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsNotEmpty,
  IsArray,
} from 'class-validator';

export class CreateRestaurantBookingDto {
  @ApiProperty({ description: 'List of restaurant table IDs being booked', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  tableIds: number[];

  @ApiProperty({
    description: 'Check-in datetime (ISO or dd:MM:yyyy HH:mm)',
    example: '25:12:2024 19:00',
  })
  @IsString()
  @IsNotEmpty()
  checkInDate: string;

  @ApiProperty({ description: 'Reservation duration in minutes', default: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(15)
  durationMinutes: number;

  @ApiPropertyOptional({ description: 'Number of guests', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfGuests?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Tên liên hệ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contactName: string;

  @ApiProperty({ description: 'Số điện thoại liên hệ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  contactPhone: string;
}
