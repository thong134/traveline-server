import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransformDDMMYYYY } from '../../../common/utils/date.util';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVoucherDto {
  @ApiProperty({ description: 'Voucher code' })
  @IsString()
  @MaxLength(64)
  code: string;

  @ApiPropertyOptional({ description: 'Voucher description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['percentage', 'fixed'], default: 'fixed' })
  @IsEnum(['percentage', 'fixed'])
  discountType: 'percentage' | 'fixed';

  @ApiProperty({ description: 'Discount value' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  maxDiscountValue?: number;

  @ApiPropertyOptional({
    description: 'Minimum order value to apply this voucher',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  minOrderValue?: number;

  @ApiPropertyOptional({
    description: 'Maximum allowed usage count',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxUsage?: number;

  @ApiPropertyOptional({ description: 'Voucher start datetime (dd/MM/yyyy)', example: '01/01/2024' })
  @IsOptional()
  @TransformDDMMYYYY()
  @IsDate()
  startsAt?: Date;

  @ApiPropertyOptional({ description: 'Voucher expiry datetime (dd/MM/yyyy)', example: '31/12/2024' })
  @IsOptional()
  @TransformDDMMYYYY()
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: 'Whether voucher is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
