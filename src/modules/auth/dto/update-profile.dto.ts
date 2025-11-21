import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { GENDER_VALUES } from '../../user/dto/create-user.dto';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Họ và tên' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Ngày sinh (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: GENDER_VALUES })
  @IsOptional()
  @IsIn(GENDER_VALUES as unknown as string[])
  gender?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ thường trú' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Quốc tịch' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ description: 'Số CCCD/CMND' })
  @IsOptional()
  @IsString()
  citizenId?: string;

  @ApiPropertyOptional({ description: 'Đường dẫn ảnh CCCD' })
  @IsOptional()
  @IsString()
  idCardImageUrl?: string;

  @ApiPropertyOptional({ description: 'Tên ngân hàng' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Số tài khoản ngân hàng' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Chủ tài khoản ngân hàng' })
  @IsOptional()
  @IsString()
  bankAccountName?: string;
}
