import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateHobbiesDto {
  @ApiProperty({ description: 'Selected travel categories/hobbies', type: [String] })
  @IsArray()
  @IsString({ each: true })
  hobbies: string[];
}
