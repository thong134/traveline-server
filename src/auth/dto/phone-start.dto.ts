import { ApiProperty } from '@nestjs/swagger';
import { IsMobilePhone, IsString } from 'class-validator';

export class PhoneStartDto {
  @ApiProperty({ description: 'Phone number to verify' })
  @IsMobilePhone('vi-VN') // null => any locale; you can set 'vi-VN'
  phone: string;

  @ApiProperty({ description: 'reCAPTCHA verification token from Firebase client SDK' })
  @IsString()
  recaptchaToken: string;
}
