import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user-role.enum';

export class CreateUserDto {
  @ApiProperty({ description: 'Unique username for login' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: 'Raw password, hash before persistence if needed',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: UserRole })
  role?: UserRole;
}
