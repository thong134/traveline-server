import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class WalletPayDto {
  @ApiProperty({ description: 'Amount to deduct from the wallet (VND)', example: 120000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Related booking or order identifier' })
  @IsString()
  @MaxLength(255)
  referenceId: string;
}
