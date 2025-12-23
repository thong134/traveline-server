import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PhoneStartDto {
  @ApiProperty({
    description: 'reCAPTCHA token lấy từ Firebase client SDK (app/web) sau khi render reCAPTCHA)',
  })
  @IsString()
  recaptchaToken: string;
}
