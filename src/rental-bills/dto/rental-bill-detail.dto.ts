import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class RentalBillDetailDto {
  @ApiProperty({ description: 'Vehicle license plate', example: '47L7-7886' })
  @IsString()
  @Matches(/^[A-Za-z0-9\-\s]+$/)
  @MaxLength(32)
  licensePlate: string;

  @ApiProperty({
    description: 'Rental price for the selected period',
    example: 650000,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Quantity of vehicle rentals',
    default: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Additional notes from renter' })
  @IsOptional()
  @IsString()
  note?: string;
}
