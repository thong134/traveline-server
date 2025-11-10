import { PartialType } from '@nestjs/swagger';
import { CreateVehicleCatalogDto } from './create-vehicle-catalog.dto';

export class UpdateVehicleCatalogDto extends PartialType(
  CreateVehicleCatalogDto,
) {}
