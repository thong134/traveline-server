import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RentalContractStatus } from '../entities/rental-contract.entity';

export class UpdateRentalContractStatusDto {
  @ApiProperty({
    enum: RentalContractStatus,
    description: 'Trạng thái mới của hợp đồng',
  })
  @IsEnum(RentalContractStatus)
  status: RentalContractStatus;

  @ApiPropertyOptional({ description: 'Lý do từ chối nếu có' })
  @IsOptional()
  @IsString()
  rejectedReason?: string;
}

export class RejectRentalContractDto {
  @ApiProperty({ description: 'Lý do từ chối hợp đồng' })
  @IsString()
  @IsNotEmpty()
  rejectedReason: string;
}

export class RenewRentalContractDto {
  @ApiPropertyOptional({ description: 'Thời hạn hợp đồng mới' })
  @IsOptional()
  @IsString()
  contractTerm?: string;

  @ApiPropertyOptional({ description: 'Ghi chú bổ sung cho hợp đồng' })
  @IsOptional()
  @IsString()
  notes?: string;
}
