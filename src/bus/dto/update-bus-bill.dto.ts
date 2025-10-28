import { PartialType } from '@nestjs/swagger';
import { CreateBusBillDto } from './create-bus-bill.dto';

export class UpdateBusBillDto extends PartialType(CreateBusBillDto) {}
