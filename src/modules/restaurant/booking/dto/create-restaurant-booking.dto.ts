import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsNotEmpty,
  ValidateNested,
  IsArray,
} from 'class-validator';

export class RestaurantBookingItemDto {
  @ApiProperty({ description: 'Table ID' })
  @IsInt()
  @Min(1)
  tableId: number;

  @ApiProperty({ description: 'Quantity of tables', default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateRestaurantBookingDto {
  @ApiPropertyOptional({ description: 'Single table ID (deprecated if items used)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tableId?: number;

  @ApiPropertyOptional({ type: [RestaurantBookingItemDto], description: 'List of tables to book' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestaurantBookingItemDto)
  items?: RestaurantBookingItemDto[];

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
