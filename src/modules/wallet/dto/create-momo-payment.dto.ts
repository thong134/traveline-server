
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMomoPaymentDto {
  @ApiProperty({ example: 50000, description: 'Số tiền cần nạp (VND)' })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ required: false, example: 'Nạp tiền vào ví Traveline' })
  @IsString()
  @IsOptional()
  orderInfo?: string;
}
