import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { RentalBillDetailDto } from './rental-bill-detail.dto';
import { RentalBillStatus, RentalBillType } from '../entities/rental-bill.entity';

export class CreateRentalBillDto {
  @ApiPropertyOptional({ description: 'Contract id of the vehicle owner' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  contractId?: number;

  @ApiProperty({
    enum: RentalBillType,
    description: 'Rental type indicates hourly or daily pricing',
    default: RentalBillType.DAILY,
  })
  @IsEnum(RentalBillType)
  rentalType: RentalBillType;

  @ApiProperty({ description: 'Rental start time' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Rental end time' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Pickup location or meeting place' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Payment method selected by customer' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Contact person name displayed on bill' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Voucher code applied to the booking' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({
    description: 'Travel points used to discount the bill',
    default: 0,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  travelPointsUsed?: number;

  @ApiPropertyOptional({
    description: 'Bill status override (admins only)',
    enum: RentalBillStatus,
  })
  @IsOptional()
  @IsEnum(RentalBillStatus)
  status?: RentalBillStatus;

  @ApiPropertyOptional({ description: 'Reason for status override' })
  @IsOptional()
  @IsString()
  statusReason?: string;

  @ApiPropertyOptional({
    description: 'Citizenship back photo URL for verification',
  })
  @IsOptional()
  @IsString()
  citizenBackPhoto?: string;

  @ApiPropertyOptional({ description: 'Selfie verification photo URL' })
  @IsOptional()
  @IsString()
  verifiedSelfiePhoto?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: [RentalBillDetailDto],
    description: 'List of vehicles associated with the bill',
  })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => RentalBillDetailDto)
  details: RentalBillDetailDto[];

  @ApiPropertyOptional({
    description: 'Override total amount; defaults to sum of details',
    example: 650000,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  total?: number;
}
