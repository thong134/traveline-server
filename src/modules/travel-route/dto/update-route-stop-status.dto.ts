import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RouteStopStatus } from '../entities/route-stop.entity';

export class UpdateRouteStopStatusDto {
  @ApiProperty({ enum: RouteStopStatus })
  @IsEnum(RouteStopStatus)
  status: RouteStopStatus;
}
