import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại' })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({ description: 'Mật khẩu mới' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
