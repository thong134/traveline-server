import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsDate, IsEmail, IsMobilePhone } from 'class-validator';
import { TransformDDMMYYYY } from '../../../common/utils/date.util';

export const GENDER_VALUES = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDER_VALUES)[number];

export class UpdateInitialProfileDto {
  @ApiPropertyOptional()
  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsMobilePhone()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ enum: GENDER_VALUES })
  @IsIn(GENDER_VALUES as unknown as string[])
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({ description: 'Date of birth in dd/MM/yyyy format', example: '13/04/2004' })
  @TransformDDMMYYYY()
  @IsDate()
  @IsOptional()
  dateOfBirth?: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  citizenId?: string;
}
