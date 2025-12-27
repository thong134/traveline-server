import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PublicizeTravelRouteDto {
  @ApiPropertyOptional({ description: 'Optional name for the public version' })
  @IsOptional()
  @IsString()
  name?: string;
}
