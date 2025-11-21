import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Tên loại hình địa điểm du lịch' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
