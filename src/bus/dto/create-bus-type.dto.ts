import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBusTypeDto {
  @ApiProperty({ description: 'Owning cooperation id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cooperationId: number;

  @ApiProperty({ description: 'Bus type name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Number of seats in the bus type' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfSeats?: number;

  @ApiPropertyOptional({ description: 'Number of buses available' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  numberOfBuses?: number;

  @ApiProperty({ description: 'Ticket price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Route details' })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo?: string;
}
