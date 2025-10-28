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
import { BusBillStatus } from '../bus-bill.entity';
import { BusBillSeatDto } from './bus-bill-seat.dto';

export class CreateBusBillDto {
  @ApiProperty({ description: 'User id creating the booking' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ description: 'Bus type id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  busTypeId: number;

  @ApiProperty({ description: 'Pick up location' })
  @IsString()
  @MaxLength(255)
  pickUpLocation: string;

  @ApiPropertyOptional({ description: 'Pick up time' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pickUpTime?: string;

  @ApiProperty({ description: 'Start date' })
  @IsString()
  startDate: string;

  @ApiProperty({ description: 'End date' })
  @IsString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Return pick up location' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  returnPickUpLocation?: string;

  @ApiPropertyOptional({ description: 'Return pick up time' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  returnPickUpTime?: string;

  @ApiPropertyOptional({ description: 'Return start date' })
  @IsOptional()
  @IsString()
  returnStartDate?: string;

  @ApiPropertyOptional({ description: 'Return end date' })
  @IsOptional()
  @IsString()
  returnEndDate?: string;

  @ApiProperty({ description: 'Selected seat details', type: [BusBillSeatDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BusBillSeatDto)
  seats: BusBillSeatDto[];

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
  @IsEnum(BusBillStatus)
  status?: BusBillStatus;

  @ApiPropertyOptional({ description: 'Reason for status override' })
  @IsOptional()
  @IsString()
  statusReason?: string;
}
