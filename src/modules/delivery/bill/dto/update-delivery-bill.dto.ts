import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDeliveryBillDto {
  @ApiPropertyOptional({ description: 'Contact name (Sender)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Contact phone (Sender)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Pick-up address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Destination address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiveAddress?: string;

  @ApiPropertyOptional({ description: 'Receiver name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  receiverName?: string;

  @ApiPropertyOptional({ description: 'Receiver phone' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  receiverPhone?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Voucher code to apply' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({ description: 'Travel points used for discount' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  travelPointsUsed?: number;
}
