import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export enum BusinessType {
  PERSONAL = 'personal',
  COMPANY = 'company',
}

export enum CreateRentalContractStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export class CreateRentalContractDto {
  @ApiPropertyOptional({ description: 'Citizen identification number' })
  @IsOptional()
  @IsString()
  citizenId?: string;

  @ApiProperty({ enum: BusinessType, default: BusinessType.PERSONAL })
  @IsEnum(BusinessType)
  businessType: BusinessType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessProvince?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiPropertyOptional({ description: 'Tax code if business type is company' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({
    description: 'Business registration certificate photo url',
  })
  @IsOptional()
  @IsString()
  businessRegisterPhoto?: string;

  @ApiPropertyOptional({ description: 'Citizen ID front photo url' })
  @IsOptional()
  @IsString()
  citizenFrontPhoto?: string;

  @ApiPropertyOptional({ description: 'Citizen ID back photo url' })
  @IsOptional()
  @IsString()
  citizenBackPhoto?: string;

  @ApiPropertyOptional({
    description: 'Contract term description (e.g. 12 months)',
  })
  @IsOptional()
  @IsString()
  contractTerm?: string;

  @ApiPropertyOptional({ description: 'Additional notes from owner' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Bank name for payouts' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank account number for payouts' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank account holder name' })
  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @ApiProperty({ description: 'Owner agrees to Traveline rental terms' })
  @IsBoolean()
  termsAccepted: boolean;
}
