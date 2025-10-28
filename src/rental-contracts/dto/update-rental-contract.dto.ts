import { PartialType } from '@nestjs/swagger';
import { CreateRentalContractDto } from './create-rental-contract.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RentalContractStatus } from '../rental-contract.entity';

export class UpdateRentalContractDto extends PartialType(
  CreateRentalContractDto,
) {
  @ApiPropertyOptional({ enum: RentalContractStatus })
  @IsOptional()
  @IsEnum(RentalContractStatus)
  status?: RentalContractStatus;

  @ApiPropertyOptional({ description: 'Admin reason when status changes' })
  @IsOptional()
  @IsString()
  statusReason?: string;
}
