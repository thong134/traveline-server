import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
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

  @ApiPropertyOptional({ description: 'Internal user id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({ description: 'User Firebase UID' })
  @IsOptional()
  @IsString()
  userUid?: string;

  @ApiPropertyOptional({ description: 'Legacy feedback identifier' })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ description: 'Destination internal id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationId?: number;

  @ApiPropertyOptional({ description: 'Destination external id' })
  @IsOptional()
  @IsString()
  destinationExternalId?: string;

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
  @IsString()
  cooperationId?: string;

  @ApiPropertyOptional({ description: 'Feedback comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Feedback date (ISO string)' })
  @IsOptional()
  @IsDateString()
  date?: string;

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

  @ApiPropertyOptional({
    enum: STATUS_VALUES,
    description: 'Feedback status',
    default: 'pending',
  })
  @IsOptional()
  @IsIn(STATUS_VALUES as unknown as string[])
  status?: FeedbackStatus;
}
