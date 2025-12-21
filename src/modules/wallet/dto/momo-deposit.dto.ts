import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class MomoDepositDto {
  @ApiProperty({ description: 'Số tiền nạp (VND)', example: 100000 })
  @IsNumber()
  @Min(1000, { message: 'Số tiền tối thiểu là 1,000 VND' })
  amount: number;

  @ApiProperty({
    description: 'Mã giao dịch MoMo (giả lập)',
    example: 'MOMO1234567890',
  })
  @IsString()
  @IsNotEmpty()
  momoTransactionId: string;
}
