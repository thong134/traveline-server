import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class TrainBillPassengerDto {
  @ApiProperty({ description: 'Passenger full name' })
  @IsString()
  @MaxLength(255)
  passengerName: string;

  @ApiPropertyOptional({ description: 'Passenger phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  passengerPhone?: string;

  @ApiPropertyOptional({ description: 'Assigned seat number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  seatNumber?: string;

  @ApiPropertyOptional({ description: 'Seat class' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  seatClass?: string;

  @ApiProperty({ description: 'Ticket price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  total: number;
}
