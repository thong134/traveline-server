import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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
}
