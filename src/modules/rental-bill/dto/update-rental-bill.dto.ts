import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateRentalBillDto {
  @ApiPropertyOptional({ description: 'Tên người liên hệ' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại liên hệ' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Mã giảm giá' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({ description: 'Số điểm TravelPoint muốn sử dụng' })
  @IsOptional()
  @IsString()
  travelPointsUsed?: number;
}
