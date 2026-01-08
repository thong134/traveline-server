import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class PhoneStartDto {
  @ApiProperty({
    description: 'reCAPTCHA token (Optional if using Test Phone Numbers in Firebase Console)',
    required: false,
  })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}
