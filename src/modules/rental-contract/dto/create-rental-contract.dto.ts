import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum BusinessType {
  PERSONAL = 'personal',
  COMPANY = 'company',
}

export class CreateRentalContractDto {
  @ApiProperty({ description: 'Full name for business contact' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Email for business contact' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Phone number for business contact' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'Citizen identification number' })
  @IsString()
  @IsNotEmpty()
  citizenId: string;

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
    description: 'Business registration certificate image',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  @IsString()
  businessRegisterPhoto?: string;

  @ApiPropertyOptional({
    description: 'Citizen ID front photo',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  @IsString()
  citizenFrontPhoto?: string;

  @ApiPropertyOptional({
    description: 'Citizen ID back photo',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  @IsString()
  citizenBackPhoto?: string;

  @ApiPropertyOptional({ description: 'Additional notes from owner' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Bank name for payouts' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({ description: 'Bank account number for payouts' })
  @IsString()
  @IsNotEmpty()
  bankAccountNumber: string;

  @ApiProperty({ description: 'Bank account holder name' })
  @IsString()
  @IsNotEmpty()
  bankAccountName: string;

  @ApiProperty({ description: 'Owner agrees to Traveline rental terms' })
  @Transform(
    ({ value }) =>
      value === true || value === 'true' || value === 1 || value === '1',
  )
  @IsBoolean()
  termsAccepted: boolean;
}
