import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateSharedDto {
  @ApiProperty({ description: 'Đặt true để share, false để riêng tư', default: true })
  @IsBoolean()
  shared: boolean;
}

