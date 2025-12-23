import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RentalOwnerCancelDto {
  @ApiProperty({ description: 'Lý do hủy đơn', example: 'Xe bị hỏng đột xuất' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason: string;
}
