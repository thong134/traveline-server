import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsDate } from 'class-validator';
import { TransformDDMMYYYY } from '../../../common/utils/date.util';

export const GENDER_VALUES = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDER_VALUES)[number];

export class UpdateInitialProfileDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ enum: GENDER_VALUES })
  @IsOptional()
  @IsIn(GENDER_VALUES as unknown as string[])
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
  @IsOptional()
  @TransformDDMMYYYY()
  @IsDate()
  dateOfBirth?: Date;
}
