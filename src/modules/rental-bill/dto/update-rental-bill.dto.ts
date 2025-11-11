import { PartialType } from '@nestjs/swagger';
import { CreateRentalBillDto } from './create-rental-bill.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { RentalBillStatus, RentalBillType } from '../entities/rental-bill.entity';
import { RentalBillDetailDto } from './rental-bill-detail.dto';

export class UpdateRentalBillDto extends PartialType(CreateRentalBillDto) {
  @ApiPropertyOptional({ enum: RentalBillType })
  @IsOptional()
  @IsEnum(RentalBillType)
  rentalType?: RentalBillType;

  @ApiPropertyOptional({ description: 'Override total amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  total?: number;

  @ApiPropertyOptional({ enum: RentalBillStatus })
  @IsOptional()
  @IsEnum(RentalBillStatus)
  status?: RentalBillStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  statusReason?: string;

  @ApiPropertyOptional({
    type: [RentalBillDetailDto],
    description: 'Updated list of vehicles',
  })
  @IsOptional()
  details?: RentalBillDetailDto[];
}
