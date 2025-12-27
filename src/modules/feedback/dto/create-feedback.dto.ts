import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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

const STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;
export type FeedbackStatus = (typeof STATUS_VALUES)[number];

export class CreateFeedbackDto {
  @ApiProperty({ description: 'Star rating between 1 and 5' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  star: number;

  @ApiPropertyOptional({ description: 'Destination internal id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationId?: number;

  @ApiPropertyOptional({ description: 'Travel route id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  travelRouteId?: number;

  @ApiPropertyOptional({ description: 'Vehicle license plate' })
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @ApiPropertyOptional({ description: 'Cooperation id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cooperationId?: number;

  @ApiPropertyOptional({ description: 'Feedback comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Photo URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl(undefined, { each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Video URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl(undefined, { each: true })
  videos?: string[];

}
