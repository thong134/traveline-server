import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsDateString,
  MinLength,
  IsMobilePhone,
  IsIn,
  IsUrl,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const GENDER_VALUES = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDER_VALUES)[number];

export class CreateUserDto {
  @ApiProperty({ description: 'Unique username for login' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: 'Raw password, hash before persistence if needed',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'Primary email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Firebase UID or external identity' })
  @IsOptional()
  @IsString()
  uid?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Phone number in E.164 format' })
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @ApiPropertyOptional({ description: 'Date of birth in ISO 8601 format' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: GENDER_VALUES })
  @IsOptional()
  @IsIn(GENDER_VALUES as unknown as string[])
  gender?: Gender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  citizenId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'idCardImageUrl must be a valid URL' })
  idCardImageUrl?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank account number' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank account holder name' })
  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl must be a valid URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Hobby keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hobbies?: string[];

  @ApiPropertyOptional({
    description: 'Favourite destination ids',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favoriteDestinationIds?: string[];

  @ApiPropertyOptional({ description: 'Favourite hotel ids', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favoriteHotelIds?: string[];

  @ApiPropertyOptional({
    description: 'Favourite restaurant ids',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favoriteRestaurantIds?: string[];

  @ApiPropertyOptional({ description: 'User travel points balance' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  travelPoint?: number;

  @ApiPropertyOptional({ description: 'Number of trips joined' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  travelTrip?: number;

  @ApiPropertyOptional({ description: 'Feedback submissions count' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  feedbackTimes?: number;

  @ApiPropertyOptional({ description: 'Participation days count' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dayParticipation?: number;

  @ApiPropertyOptional({ description: 'User membership tier' })
  @IsOptional()
  @IsString()
  userTier?: string;
}
