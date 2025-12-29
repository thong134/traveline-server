import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  IsUrl,
} from 'class-validator';

export class CreateProvinceDto {
  @ApiProperty({ description: 'Unique province code', example: 'DN' })
  @IsString()
  @MinLength(2)
  code: string;

  @ApiProperty({ description: 'Province name', example: 'Đà Nẵng' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ description: 'Province name in English' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty({ description: 'Full province name' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ description: 'Full province name in English' })
  @IsOptional()
  @IsString()
  fullNameEn?: string;

  @ApiPropertyOptional({ description: 'Code name' })
  @IsOptional()
  @IsString()
  codeName?: string;

  @ApiPropertyOptional({ description: 'Avatar image URL' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Administrative Unit ID' })
  @IsOptional()
  administrativeUnitId?: number;

  @ApiPropertyOptional({ description: 'Administrative Region ID' })
  @IsOptional()
  administrativeRegionId?: number;
}
