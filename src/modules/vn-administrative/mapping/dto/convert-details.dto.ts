import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConvertOldToNewDetailsDto {
  @ApiProperty({ description: 'Legacy province name', example: 'Đà Nẵng' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiPropertyOptional({ description: 'Legacy district name', example: 'Hải Châu' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: 'Legacy ward name', example: 'Thạch Thang' })
  @IsString()
  @IsOptional()
  ward?: string;
}

export class ConvertNewToOldDetailsDto {
  @ApiProperty({ description: 'Reform province name', example: 'Đà Nẵng' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiPropertyOptional({ description: 'Reform commune name', example: 'Thạch Thang' })
  @IsString()
  @IsOptional()
  commune?: string;
}
