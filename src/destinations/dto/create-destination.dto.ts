import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDestinationDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsOptional()
  @IsNumber()
   @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}