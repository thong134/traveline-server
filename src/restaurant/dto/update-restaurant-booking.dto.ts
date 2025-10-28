import { PartialType } from '@nestjs/swagger';
import { CreateRestaurantBookingDto } from './create-restaurant-booking.dto';

export class UpdateRestaurantBookingDto extends PartialType(
  CreateRestaurantBookingDto,
) {}
