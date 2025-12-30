import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateFcmTokenDto {
  @ApiProperty({ example: 'fcm_token_string_here' })
  @IsNotEmpty()
  @IsString()
  token: string;
}
