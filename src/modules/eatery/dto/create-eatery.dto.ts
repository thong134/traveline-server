import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEateryDto {
  @ApiProperty({ description: 'Tên quán ăn nổi tiếng' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name: string;

  @ApiProperty({ description: 'Tỉnh/Thành phố' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  province: string;

  @ApiProperty({ description: 'Địa chỉ chi tiết' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ApiPropertyOptional({ description: 'Mô tả ngắn' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại liên hệ' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Ảnh đại diện' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
