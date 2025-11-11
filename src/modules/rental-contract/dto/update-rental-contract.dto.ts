import { PartialType } from '@nestjs/swagger';
import { CreateRentalContractDto } from './create-rental-contract.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RentalContractStatus } from '../entities/rental-contract.entity';

export class UpdateRentalContractDto extends PartialType(
  CreateRentalContractDto,
) {
  @ApiPropertyOptional({ enum: RentalContractStatus })
  @IsOptional()
  @IsEnum(RentalContractStatus)
  status?: RentalContractStatus;

  @ApiPropertyOptional({ description: 'Reason for rejecting the contract' })
  @IsOptional()
  @IsString()
  rejectedReason?: string;
}
