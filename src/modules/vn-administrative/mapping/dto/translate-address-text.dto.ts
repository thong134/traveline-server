import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TranslateAddressTextDto {
  @ApiProperty({
    description: 'Original specific address details (house number, street, hamlet, etc.)',
    example: '150 Nguyễn Hữu Thọ, Hòa Thuận Nam',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  specificAddress: string;

  @ApiProperty({
    description: 'Legacy province/municipality name before the 2025 resolution',
    example: 'Đà Nẵng',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  provinceName: string;

  @ApiProperty({
    description: 'Legacy ward/commune name before the 2025 resolution',
    example: 'Hòa Thuận Nam',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  wardName: string;
}
