import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReplyDto {
  @ApiProperty({ description: 'Nội dung trả lời' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

