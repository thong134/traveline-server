import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class CoordinatesDto {
  @ApiPropertyOptional({ description: 'Vĩ độ của điểm bắt đầu' })
  @IsNumber()
  latitude: number;

  @ApiPropertyOptional({ description: 'Kinh độ của điểm bắt đầu' })
  @IsNumber()
  longitude: number;
}

export class SuggestTravelRouteDto {
  @ApiPropertyOptional({ description: 'ID điểm bắt đầu (ưu tiên nếu cung cấp)' })
  @IsOptional()
  @IsInt()
  startDestinationId?: number;

  @ApiPropertyOptional({
    description: 'Tọa độ bắt đầu nếu không dùng điểm có sẵn',
    type: CoordinatesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  startCoordinates?: CoordinatesDto;

  @ApiPropertyOptional({ description: 'Nhãn hiển thị cho điểm xuất phát (khi dùng tọa độ)' })
  @IsOptional()
  @IsString()
  startLabel?: string;

  @ApiPropertyOptional({ description: 'Danh sách điểm muốn ghé thăm', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  destinationIds?: number[];

  @ApiPropertyOptional({ description: 'Giới hạn phạm vi theo tỉnh/thành' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Tổng thời gian tối đa (giờ)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTime?: number;

  @ApiPropertyOptional({ description: 'Số điểm gợi ý', default: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topN = 5;

  @ApiPropertyOptional({ description: 'Bao gồm cả địa điểm đã được người dùng đánh giá', default: false })
  @IsOptional()
  @IsBoolean()
  includeRated = false;

  @ApiPropertyOptional({ description: 'Seed ngẫu nhiên để tái lập kết quả' })
  @IsOptional()
  @IsInt()
  randomSeed?: number;
}
