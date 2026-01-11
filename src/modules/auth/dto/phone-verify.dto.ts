import { ApiProperty } from '@nestjs/swagger';
import { IsMobilePhone, IsString, Length } from 'class-validator';

export class PhoneVerifyDto {
  @ApiProperty({ description: 'Phone number to verify' })
  @IsMobilePhone('vi-VN') // null => any locale; you can set 'vi-VN'
  phone: string;

  @ApiProperty({ minLength: 4, maxLength: 6 })
  @IsString()
  @Length(4, 6)
  code: string;

  @ApiProperty({
    description: 'Bắt buộc: sessionInfo trả về từ bước /auth/phone/start (Firebase yêu cầu để định danh phiên gửi mã)',
  })
  @IsString()
  sessionInfo: string;
}
