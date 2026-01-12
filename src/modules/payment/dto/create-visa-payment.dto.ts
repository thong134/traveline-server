import { IsNotEmpty, IsNumber, IsString, Length, Matches, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVisaPaymentDto {
  @ApiProperty({ example: 123, description: 'ID của RentalBill' })
  @IsNumber()
  @IsNotEmpty()
  rentalId: number;

  @ApiProperty({ example: 500000, description: 'Số tiền thanh toán' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: '4242424242424242', description: 'Số thẻ Visa (13-19 số)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{13,19}$/, { message: 'Số thẻ không hợp lệ (chỉ gồm số, dài 13-19 ký tự)' })
  cardNumber: string;

  @ApiProperty({ example: 'TRAN QUOC TUAN', description: 'Tên chủ thẻ (in hoa, không dấu)' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  cardHolderName: string;

  @ApiProperty({ example: '12/28', description: 'Ngày hết hạn (MM/YY)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, { message: 'Định dạng ngày hết hạn phải là MM/YY' })
  expiryDate: string;

  @ApiProperty({ example: '123', description: 'Mã CVV (3 số)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{3,4}$/, { message: 'CVV phải là 3 hoặc 4 số' })
  cvv: string;
}
