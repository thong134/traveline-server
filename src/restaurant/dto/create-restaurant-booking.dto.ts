import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { RestaurantBookingStatus } from '../restaurant-booking.entity';

export class CreateRestaurantBookingDto {
  @ApiProperty({ description: 'User id placing the booking' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ description: 'Restaurant table id being booked' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tableId: number;

  @ApiProperty({ description: 'Check-in datetime' })
  @IsDateString()
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

  @ApiPropertyOptional({ description: 'Initial status override' })
  @IsOptional()
  @IsEnum(RestaurantBookingStatus)
  status?: RestaurantBookingStatus;

  @ApiPropertyOptional({ description: 'Reason for status override' })
  @IsOptional()
  @IsString()
  statusReason?: string;
}
