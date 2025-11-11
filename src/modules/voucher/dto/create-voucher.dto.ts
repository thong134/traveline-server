import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
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
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  maxDiscountValue?: number;

  @ApiPropertyOptional({
    description: 'Minimum order value to apply this voucher',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  minOrderValue?: number;

  @ApiPropertyOptional({
    description: 'Maximum allowed usage count',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxUsage?: number;

  @ApiPropertyOptional({ description: 'Voucher start datetime (ISO)' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Voucher expiry datetime (ISO)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Whether voucher is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
