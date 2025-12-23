import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransformDDMMYYYY } from '../../../common/utils/date.util';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum RentalType {
  HOURLY = 'hourly',
  DAILY = 'daily',
}

export class SearchRentalVehicleDto {
  @ApiPropertyOptional({
    enum: RentalType,
    description: 'Loại thuê: theo giờ hoặc theo ngày',
  })
  @IsOptional()
  @IsEnum(RentalType)
  rentalType?: RentalType;

  @ApiPropertyOptional({
    description: 'Giá tối thiểu (so với pricePerHour nếu hourly, pricePerDay nếu daily)',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Giá tối đa (so với pricePerHour nếu hourly, pricePerDay nếu daily)',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu thuê (dd/MM/yyyy)',
    example: '25/12/2024',
  })
  @IsOptional()
  @TransformDDMMYYYY()
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc thuê (dd/MM/yyyy)',
    example: '27/12/2024',
  })
  @IsOptional()
  @TransformDDMMYYYY()
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Tỉnh/thành phố để lọc xe theo địa điểm kinh doanh của chủ xe',
    example: 'Hồ Chí Minh',
  })
  @IsOptional()
  @IsString()
  province?: string;
}
