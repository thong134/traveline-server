import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RentalBillDetailDto {
  @ApiProperty({ description: 'Biển số xe', example: '47L7-7886' })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @ApiPropertyOptional({ description: 'Ghi chú cho xe này' })
  @IsOptional()
  @IsString()
  note?: string;
}
