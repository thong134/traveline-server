import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RejectRentalContractDto {
  @ApiProperty({ description: 'Lý do từ chối hợp đồng' })
  @IsString()
  @IsNotEmpty()
  rejectedReason: string;
}

export class SuspendRentalContractDto {
  @ApiPropertyOptional({ description: 'Lý do ngưng hợp tác' })
  @IsOptional()
  @IsString()
  reason?: string;
}
