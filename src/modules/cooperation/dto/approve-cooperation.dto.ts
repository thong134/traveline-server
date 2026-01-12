import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { CommissionType } from '../entities/cooperation-enums';

export class ApproveCooperationDto {
  @ApiProperty({ enum: CommissionType })
  @IsEnum(CommissionType)
  commissionType: CommissionType;

  @ApiProperty({ description: 'Giá trị hoa hồng (nếu PERCENT thì là %, nếu FIXED thì là số tiền)' })
  @IsString()
  commissionValue: string;
}
