import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({ description: 'Star rating between 1 and 5' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  star: number;

  @ApiPropertyOptional({ description: 'Destination internal id' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  destinationId?: number;

  @ApiPropertyOptional({ description: 'Travel route id' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  travelRouteId?: number;

  @ApiPropertyOptional({ description: 'Vehicle license plate' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : value))
  @IsString()
  licensePlate?: string;

  @ApiPropertyOptional({ description: 'Cooperation id' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  cooperationId?: number;

  @ApiPropertyOptional({ description: 'Feedback comment' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === 'null' ? undefined : value))
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Photo URLs', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === 'null' ? [] : value))
  @IsArray()
  @IsUrl(undefined, { each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Video URLs', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === 'null' ? [] : value))
  @IsArray()
  @IsUrl(undefined, { each: true })
  videos?: string[];

}
