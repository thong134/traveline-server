import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransformDDMMYYYY } from '../../../common/utils/date.util';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CommissionType,
  CooperationStatus,
} from '../entities/cooperation-enums';

export class CreateCooperationDto {
  @ApiProperty({ description: 'Partner display name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Partner category such as hotel, restaurant, delivery',
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'User id who manages this cooperation' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;


  @ApiPropertyOptional({ description: 'Street address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'District' })
  @IsOptional()
  @IsString()
  district?: string;


  @ApiPropertyOptional({ description: 'Province' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Photo url' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ description: 'Extension phone number' })
  @IsOptional()
  @IsString()
  extension?: string;

  @ApiPropertyOptional({ description: 'Introduction text' })
  @IsOptional()
  @IsString()
  introduction?: string;

  @ApiPropertyOptional({
    description: 'Contract effective date (dd/MM/yyyy)',
    example: '13/04/2004',
  })
  @IsOptional()
  @TransformDDMMYYYY()
  @IsDate()
  contractDate?: Date;

  @ApiPropertyOptional({ description: 'Contract term description' })
  @IsOptional()
  @IsString()
  contractTerm?: string;

  @ApiPropertyOptional({ description: 'Bank account number used for payouts' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank account holder name' })
  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  bankName?: string;


  @ApiPropertyOptional({
    enum: CooperationStatus,
    default: CooperationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(CooperationStatus)
  status?: CooperationStatus;

  @ApiPropertyOptional({ enum: CommissionType })
  @IsOptional()
  @IsEnum(CommissionType)
  commissionType?: CommissionType;

  @ApiPropertyOptional({
    description: 'Value for commission (percentage or fixed amount)',
  })
  @IsOptional()
  @IsString()
  commissionValue?: string;

  @ApiPropertyOptional({ description: 'Tax Identification Number' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ description: 'Legal representative name' })
  @IsOptional()
  @IsString()
  representativeName?: string;

  @ApiPropertyOptional({ description: 'Legal representative phone' })
  @IsOptional()
  @IsString()
  representativePhone?: string;

  @ApiPropertyOptional({ description: 'Legal representative email' })
  @IsOptional()
  @IsEmail()
  representativeEmail?: string;

  @ApiPropertyOptional({ description: 'Current active contract PDF URL' })
  @IsOptional()
  @IsString()
  currentContractUrl?: string;
}
