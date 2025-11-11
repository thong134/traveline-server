import { PartialType } from '@nestjs/swagger';
import { CreateHotelBillDto } from './create-hotel-bill.dto';

export class UpdateHotelBillDto extends PartialType(CreateHotelBillDto) {}
