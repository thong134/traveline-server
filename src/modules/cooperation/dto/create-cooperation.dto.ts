import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransformDDMMYYYY } from '../../../common/utils/date.util';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Custom reference code' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @ApiPropertyOptional({ description: 'User id who manages this cooperation' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({
    description: 'Total number of objects managed by the partner',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numberOfObjects?: number;

  @ApiPropertyOptional({
    description: 'The number of object types that the partner manages',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numberOfObjectTypes?: number;

  @ApiPropertyOptional({ description: 'Primary representative name' })
  @IsOptional()
  @IsString()
  bossName?: string;

  @ApiPropertyOptional({ description: 'Primary representative phone number' })
  @IsOptional()
  @IsString()
  bossPhone?: string;

  @ApiPropertyOptional({ description: 'Primary representative email' })
  @IsOptional()
  @IsEmail()
  bossEmail?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'District' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Province' })
  @IsOptional()
  @IsString()
  province?: string;

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

  @ApiPropertyOptional({ description: 'Contract effective date (dd/MM/yyyy)', example: '13/04/2004' })
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
    description: 'Whether the cooperation is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
