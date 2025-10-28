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

export class CreateDeliveryVehicleDto {
  @ApiProperty({ description: 'Owning cooperation id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cooperationId: number;

  @ApiProperty({ description: 'Vehicle type name' })
  @IsString()
  @MaxLength(255)
  typeName: string;

  @ApiPropertyOptional({ description: 'Package size limitation' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sizeLimit?: string;

  @ApiPropertyOptional({ description: 'Package weight limitation' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  weightLimit?: string;

  @ApiPropertyOptional({ description: 'Base price for first 10km' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceLessThan10Km?: number;

  @ApiPropertyOptional({ description: 'Additional price per km after 10km' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceMoreThan10Km?: number;

  @ApiPropertyOptional({ description: 'Vehicle photo url' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  note?: string;
}
