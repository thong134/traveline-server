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

  @ApiPropertyOptional({
    description: 'Geographic region grouping',
    example: 'Miền Trung',
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Short description for display' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether province is active for selection',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
