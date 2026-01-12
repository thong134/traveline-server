import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class QuickSuggestTravelRouteDto {
  @ApiProperty({ description: 'Tỉnh/thành phố muốn đi du lịch', example: 'Da Nang' })
  @IsNotEmpty()
  @IsString()
  province: string;

  @ApiProperty({ description: 'Ngày bắt đầu (dd/MM/yyyy)', example: '27/12/2024' })
  @IsNotEmpty()
  @IsString()
  startDate: string;

  @ApiProperty({ description: 'Ngày kết thúc (dd/MM/yyyy)', example: '29/12/2024' })
  @IsNotEmpty()
  @IsString()
  endDate: string;

  @ApiPropertyOptional({ 
    description: 'Ngôn ngữ trả về (vi/en/both). Mặc định: both', 
    example: 'both',
    enum: ['vi', 'en', 'both']
  })
  @IsOptional()
  @IsString()
  @IsIn(['vi', 'en', 'both'])
  lang?: 'vi' | 'en' | 'both';
}
