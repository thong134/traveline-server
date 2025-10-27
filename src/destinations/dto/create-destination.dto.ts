import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDestinationDto {
  @ApiProperty({ description: 'Destination name' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: 'Destination type label' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Vietnamese description' })
  @IsOptional()
  @IsString()
  descriptionViet?: string;

  @ApiPropertyOptional({ description: 'English description' })
  @IsOptional()
  @IsString()
  descriptionEng?: string;

  @ApiPropertyOptional({ description: 'Province / city name' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Specific street address' })
  @IsOptional()
  @IsString()
  specificAddress?: string;

  @ApiProperty({ description: 'Latitude in decimal degrees' })
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude in decimal degrees' })
  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: 'Average rating', example: 4.7 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rating?: number;

  @ApiPropertyOptional({ description: 'How many times favourited', example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  favouriteTimes?: number;

  @ApiPropertyOptional({ description: 'Total user ratings', example: 242 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  userRatingsTotal?: number;

  @ApiPropertyOptional({ description: 'Destination categories', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Photo URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl(undefined, { each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Video URL' })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Google Places ID' })
  @IsOptional()
  @IsString()
  googlePlaceId?: string;

  @ApiPropertyOptional({ description: 'Whether destination is available for booking' })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}