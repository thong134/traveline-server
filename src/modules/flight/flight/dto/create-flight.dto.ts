import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransformDDMMYYYY } from '../../../../common/utils/date.util';
import {
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFlightDto {
  @ApiProperty({ description: 'Owning cooperation id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cooperationId: number;

  @ApiProperty({ description: 'Flight number' })
  @IsString()
  @MaxLength(50)
  flightNumber: string;

  @ApiProperty({ description: 'Airline name' })
  @IsString()
  @MaxLength(255)
  airline: string;

  @ApiProperty({ description: 'Departure airport code or name' })
  @IsString()
  @MaxLength(255)
  departureAirport: string;

  @ApiProperty({ description: 'Arrival airport code or name' })
  @IsString()
  @MaxLength(255)
  arrivalAirport: string;

  @ApiProperty({ description: 'Departure time (dd/MM/yyyy)', example: '13/04/2004' })
  @TransformDDMMYYYY()
  @IsDate()
  departureTime: Date;

  @ApiProperty({ description: 'Arrival time (dd/MM/yyyy)', example: '13/04/2004' })
  @TransformDDMMYYYY()
  @IsDate()
  arrivalTime: Date;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @ApiProperty({ description: 'Base ticket price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ description: 'Seat capacity for this flight' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  seatCapacity?: number;

  @ApiPropertyOptional({ description: 'Default cabin class' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cabinClass?: string;

  @ApiPropertyOptional({ description: 'Baggage allowance description' })
  @IsOptional()
  @IsString()
  baggageAllowance?: string;

  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo?: string;

  @ApiPropertyOptional({ description: 'Additional note' })
  @IsOptional()
  @IsString()
  note?: string;
}
