import { PartialType } from '@nestjs/swagger';
import { CreateVehicleInformationDto } from './create-vehicle-information.dto';

export class UpdateVehicleInformationDto extends PartialType(
  CreateVehicleInformationDto,
) {}
