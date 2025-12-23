import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Min } from 'class-validator';
import { TransformDDMMYYYY } from '../../../common/utils/date.util';

export class HotelAvailabilityQueryDto {
  @ApiProperty({
    example: '25/12/2025',
    description: 'Ngày check-in (dd/MM/yyyy)',
  })
  @TransformDDMMYYYY()
  @IsDate()
  checkIn: Date;

  @ApiProperty({
    example: '30/12/2025',
    description: 'Ngày check-out (dd/MM/yyyy)',
  })
  @TransformDDMMYYYY()
  @IsDate()
  checkOut: Date;

  @ApiProperty({ required: false, minimum: 1, example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rooms?: number;

  @ApiProperty({ required: false, minimum: 1, example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests?: number;
}
