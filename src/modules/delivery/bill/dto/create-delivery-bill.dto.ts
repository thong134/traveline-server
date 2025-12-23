import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateDeliveryBillDto {
  @ApiProperty({ description: 'Selected delivery vehicle id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vehicleId: number;

  @ApiProperty({ description: 'Scheduled delivery date (ISO or dd:MM:yyyy HH:mm)', example: '25:12:2024 10:00' })
  @IsString()
  @IsNotEmpty()
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
  @IsNumber()
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
}
