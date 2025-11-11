import { PartialType } from '@nestjs/swagger';
import { CreateTrainRouteDto } from './create-train-route.dto';

export class UpdateTrainRouteDto extends PartialType(CreateTrainRouteDto) {}
