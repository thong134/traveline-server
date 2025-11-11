import { PartialType } from '@nestjs/swagger';
import { CreateTravelRouteDto } from './create-travel-route.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RouteStopDto } from './route-stop.dto';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTravelRouteDto extends PartialType(CreateTravelRouteDto) {
  @ApiPropertyOptional({
    description: 'Replace all route stops',
    type: [RouteStopDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  stops?: RouteStopDto[];
}
