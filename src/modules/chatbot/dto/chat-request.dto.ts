import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
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

  @ApiPropertyOptional({
    description:
      'Conversation session identifier used to preserve short-term context',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;
}

// Keep for backward compatibility with service
export class ChatImageAttachmentDto {
  type: 'base64' | 'url';
  data: string;
  mimeType?: string;
}
