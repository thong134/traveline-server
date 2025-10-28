import { PartialType } from '@nestjs/swagger';
import { CreateDeliveryBillDto } from './create-delivery-bill.dto';

export class UpdateDeliveryBillDto extends PartialType(CreateDeliveryBillDto) {}
