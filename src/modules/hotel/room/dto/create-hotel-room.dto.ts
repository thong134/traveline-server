import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateHotelRoomDto {
  @ApiProperty({ description: 'Room name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Cooperation id that owns the room' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cooperationId: number;

  @ApiPropertyOptional({ description: 'Number of beds', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfBeds?: number;

  @ApiPropertyOptional({ description: 'Maximum guests', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPeople?: number;

  @ApiPropertyOptional({ description: 'Room area in square meters' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  area?: number;

  @ApiProperty({ description: 'Price per night' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Total number of rooms available',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfRooms?: number;

  @ApiPropertyOptional({ description: 'Room photo url' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ description: 'Room description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Room amenities', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}
