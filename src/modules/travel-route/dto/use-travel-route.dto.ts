import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UseTravelRouteDto {
  @ApiProperty({ description: 'New Start Date' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ description: 'New End Date' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiProperty({ description: 'New Name for the personal route', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
