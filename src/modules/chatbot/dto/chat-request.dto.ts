import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class ChatRequestDto {
  @ApiProperty({ description: 'User message for the travel chatbot' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  message: string;

  @ApiPropertyOptional({
    description: 'Preferred language for the reply (vi | en)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['vi', 'en'])
  lang?: string;
}
