import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConvertAddressDto {
  @ApiProperty({
    description: 'Full address string to convert',
    example: '123 Nguyen Hue, Ben Nghe, Quan 1, TP Ho Chi Minh',
  })
  @IsString()
  @IsNotEmpty()
  address: string;
}
