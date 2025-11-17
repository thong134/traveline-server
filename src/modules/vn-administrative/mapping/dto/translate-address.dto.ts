import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class TranslateAddressDto {
  @ApiProperty({
    description: 'Legacy province code (before reform)',
    example: '51',
  })
  @IsString()
  @Length(1, 20)
  provinceCode: string;

  @ApiProperty({
    description: 'Legacy district code if available',
    example: '512',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  districtCode?: string;

  @ApiProperty({
    description: 'Legacy ward/commune code if available',
    example: '51712',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  wardCode?: string;
}
