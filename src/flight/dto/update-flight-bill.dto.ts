import { PartialType } from '@nestjs/swagger';
import { CreateFlightBillDto } from './create-flight-bill.dto';

export class UpdateFlightBillDto extends PartialType(CreateFlightBillDto) {}
