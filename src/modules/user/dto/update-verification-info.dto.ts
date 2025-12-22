import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsMobilePhone } from 'class-validator';

export class UpdateVerificationInfoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  citizenId?: string;
}
