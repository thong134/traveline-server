import { PartialType } from '@nestjs/swagger';
import { CreateDeliveryVehicleDto } from './create-delivery-vehicle.dto';

export class UpdateDeliveryVehicleDto extends PartialType(
  CreateDeliveryVehicleDto,
) {}
