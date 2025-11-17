import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ChatImageAttachmentDto {
  @ApiProperty({
    description: 'Attachment type',
    enum: ['base64', 'url'],
    example: 'base64',
  })
  @IsIn(['base64', 'url'])
  type: 'base64' | 'url';

  @ApiProperty({
    description: 'Image data (base64 string without data URI prefix or a URL)',
    example: 'iVBORw0KGgoAAAANSUhEUg...',
  })
  @IsString()
  @IsNotEmpty()
  data: string;

  @ApiPropertyOptional({
    description:
      'Image mime type (required for base64 attachments when not inferable)',
    example: 'image/jpeg',
  })
  @IsOptional()
  @IsString()
  @Matches(/^image\//)
  mimeType?: string;
}

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

  @ApiPropertyOptional({ description: 'Authenticated user identifier' })
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({
    description:
      'Conversation session identifier used to preserve short-term context',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Optional images for the chatbot to analyse',
    type: [ChatImageAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ChatImageAttachmentDto)
  images?: ChatImageAttachmentDto[];
}
