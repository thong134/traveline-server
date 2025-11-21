import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class WalletDepositDto {
  @ApiProperty({ description: 'Amount to add to the wallet (VND)', example: 50000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Optional reference identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  referenceId?: string;
}
