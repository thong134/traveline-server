import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterCooperationDto {
  @ApiProperty({ description: 'Tên đơn vị hợp tác' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Loại hình (hotel, restaurant, tour, transportation, delivery...)' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Tên người đại diện' })
  @IsOptional()
  @IsString()
  bossName?: string;

  @ApiPropertyOptional({ description: 'SĐT người đại diện' })
  @IsOptional()
  @IsString()
  bossPhone?: string;

  @ApiPropertyOptional({ description: 'Email người đại diện' })
  @IsOptional()
  @IsEmail()
  bossEmail?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ đơn vị' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Quận/Huyện' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Thành phố/Tỉnh' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Tỉnh/Thành' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Giới thiệu ngắn về đơn vị' })
  @IsOptional()
  @IsString()
  introduction?: string;
}
