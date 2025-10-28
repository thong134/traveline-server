import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FlightBillStatus } from '../flight-bill.entity';
import { FlightBillPassengerDto } from './flight-bill-passenger.dto';

export class CreateFlightBillDto {
  @ApiProperty({ description: 'User id placing the booking' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ description: 'Flight id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  flightId: number;

  @ApiPropertyOptional({ description: 'Cabin class of the booking' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cabinClass?: string;

  @ApiProperty({ description: 'Passengers', type: [FlightBillPassengerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FlightBillPassengerDto)
  passengers: FlightBillPassengerDto[];

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

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Voucher code to apply' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({ description: 'Travel points used' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  travelPointsUsed?: number;

  @ApiPropertyOptional({ description: 'Override total amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalOverride?: number;

  @ApiPropertyOptional({ description: 'Initial status override' })
  @IsOptional()
  @IsEnum(FlightBillStatus)
  status?: FlightBillStatus;

  @ApiPropertyOptional({ description: 'Reason for manual status change' })
  @IsOptional()
  @IsString()
  statusReason?: string;
}
