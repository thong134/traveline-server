import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class FlightBillPassengerDto {
  @ApiProperty({ description: 'Passenger full name' })
  @IsString()
  @MaxLength(255)
  passengerName: string;

  @ApiPropertyOptional({ description: 'Passenger phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  passengerPhone?: string;

  @ApiPropertyOptional({ description: 'Passport or ID number' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  passportNumber?: string;

  @ApiPropertyOptional({ description: 'Assigned seat number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  seatNumber?: string;

  @ApiPropertyOptional({ description: 'Cabin class for passenger' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cabinClass?: string;

  @ApiProperty({ description: 'Ticket price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  total: number;
}
