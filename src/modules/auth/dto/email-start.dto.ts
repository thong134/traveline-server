import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class EmailStartDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}


