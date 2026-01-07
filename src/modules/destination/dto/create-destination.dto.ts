import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDestinationDto {
  @ApiProperty({ description: 'Tên địa điểm' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: 'Loại địa điểm' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Mô tả tiếng Việt' })
  @IsOptional()
  @IsString()
  descriptionViet?: string;

  @ApiPropertyOptional({ description: 'Mô tả tiếng Anh' })
  @IsOptional()
  @IsString()
  descriptionEng?: string;

  @ApiProperty({ description: 'Tỉnh/Thành phố' })
  @IsString()
  @MinLength(1)
  province: string;

  @ApiPropertyOptional({ description: 'Quận/Huyện' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Mã Quận/Huyện' })
  @IsOptional()
  @IsString()
  districtCode?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ cụ thể' })
  @IsOptional()
  @IsString()
  specificAddress?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ chuẩn hóa' })
  @IsOptional()
  @IsString()
  reformAddress?: string;

  @ApiProperty({ description: 'Vĩ độ' })
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Kinh độ' })
  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: 'Danh mục', type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').filter(v => v.trim() !== '');
    if (Array.isArray(value)) return value;
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  // Note: photos and videos are files in multipart/form-data, 
  // but we can define them here for Swagger documentation.
  @ApiPropertyOptional({ type: 'array', items: { type: 'string', format: 'binary' }, description: 'Ảnh địa điểm (Yêu cầu ít nhất 1 ảnh)' })
  @IsOptional()
  photos?: any[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'string', format: 'binary' }, description: 'Video địa điểm' })
  @IsOptional()
  videos?: any[];

  @ApiPropertyOptional({ description: 'Giờ mở cửa (HH:mm)', example: '08:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  openTime?: string;

  @ApiPropertyOptional({ description: 'Giờ đóng cửa (HH:mm)', example: '21:30' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  closeTime?: string;
}
