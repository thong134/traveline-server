import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUrl } from 'class-validator';

export class DeleteStopMediaDto {
  @ApiPropertyOptional({
    description: 'Danh sách URL ảnh cần xóa',
    type: [String],
    example: ['https://res.cloudinary.com/.../image1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: 'Danh sách URL video cần xóa',
    type: [String],
    example: ['https://res.cloudinary.com/.../video1.mp4'],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  videos?: string[];
}
