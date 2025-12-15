import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class EmailVerifyDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty({
    description: 'Token trả về từ bước start, chứa metadata xác thực',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
