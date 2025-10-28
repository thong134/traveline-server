import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
import { DeliveryBillStatus } from '../delivery-bill.entity';

export class CreateDeliveryBillDto {
  @ApiProperty({ description: 'Booking user id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ description: 'Selected delivery vehicle id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vehicleId: number;

  @ApiProperty({ description: 'Scheduled delivery date' })
  @IsDateString()
  deliveryDate: string;

  @ApiProperty({ description: 'Pick-up address for the delivery' })
  @IsString()
  @MaxLength(500)
  deliveryAddress: string;

  @ApiPropertyOptional({ description: 'Destination address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiveAddress?: string;

  @ApiPropertyOptional({ description: 'Package description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Receiver full name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  receiverName?: string;

  @ApiPropertyOptional({ description: 'Receiver phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  receiverPhone?: string;

  @ApiPropertyOptional({ description: 'Estimated distance in kilometers' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  distanceKm?: number;

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

  @ApiPropertyOptional({ enum: DeliveryBillStatus })
  @IsOptional()
  @IsEnum(DeliveryBillStatus)
  status?: DeliveryBillStatus;

  @ApiPropertyOptional({ description: 'Reason for manual status change' })
  @IsOptional()
  @IsString()
  statusReason?: string;

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

  @ApiPropertyOptional({ description: 'Preferred payment method' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Notes for the driver' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Override total cost' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalOverride?: number;
}
