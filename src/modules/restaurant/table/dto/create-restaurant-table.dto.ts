import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRestaurantTableDto {
  @ApiProperty({ description: 'Owning cooperation id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cooperationId: number;

  @ApiProperty({ description: 'Table name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Total number of tables of this type' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Dish type or cuisine specialty' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  dishType?: string;

  @ApiPropertyOptional({ description: 'Price range information' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  priceRange?: string;

  @ApiPropertyOptional({ description: 'Maximum guests per table' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPeople?: number;

  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Whether the table is active',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}
