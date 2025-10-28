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

export class CreateTrainRouteDto {
  @ApiProperty({ description: 'Owning cooperation id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cooperationId: number;

  @ApiProperty({ description: 'Route name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Departure station' })
  @IsString()
  @MaxLength(255)
  departureStation: string;

  @ApiProperty({ description: 'Arrival station' })
  @IsString()
  @MaxLength(255)
  arrivalStation: string;

  @ApiProperty({ description: 'Departure time (ISO 8601 time string)' })
  @IsString()
  departureTime: string;

  @ApiProperty({ description: 'Arrival time (ISO 8601 time string)' })
  @IsString()
  arrivalTime: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @ApiProperty({ description: 'Base ticket price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ description: 'Seat capacity for this route' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  seatCapacity?: number;

  @ApiPropertyOptional({ description: 'Seat class e.g. VIP, Soft seat' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  seatClass?: string;

  @ApiPropertyOptional({ description: 'Amenities or services' })
  @IsOptional()
  @IsString()
  amenities?: string;

  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo?: string;

  @ApiPropertyOptional({ description: 'Additional note' })
  @IsOptional()
  @IsString()
  note?: string;
}
