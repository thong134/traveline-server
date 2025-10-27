import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestResetDto {
  @ApiProperty({ description: 'Account email requesting password reset' })
  @IsEmail()
  email: string;
}
