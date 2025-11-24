import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class CheckInRouteStopDto {
  @ApiProperty({ description: 'Vĩ độ hiện tại', example: 10.762622 })
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Kinh độ hiện tại', example: 106.660172 })
  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    description: 'Ngưỡng sai số để xác định đã đến (mét)',
    default: 100,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  toleranceMeters?: number;
}
