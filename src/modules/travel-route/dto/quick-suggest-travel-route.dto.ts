import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class QuickSuggestTravelRouteDto {
  @ApiProperty({ description: 'Tỉnh/thành phố muốn đi du lịch', example: 'Đà Nẵng' })
  @IsNotEmpty()
  @IsString()
  province: string;

  @ApiProperty({ description: 'Ngày bắt đầu (dd/MM/yyyy)', example: '21/02/2026' })
  @IsNotEmpty()
  @IsString()
  startDate: string;

  @ApiProperty({ description: 'Ngày kết thúc (dd/MM/yyyy)', example: '22/02/2026' })
  @IsNotEmpty()
  @IsString()
  endDate: string;
}
