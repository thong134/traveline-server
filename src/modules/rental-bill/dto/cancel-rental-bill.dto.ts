import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CancelRentalBillDto {
  @ApiProperty({
    description: 'Lý do hủy đơn',
    example: 'Tôi bận việc đột xuất',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  reason: string;
}
