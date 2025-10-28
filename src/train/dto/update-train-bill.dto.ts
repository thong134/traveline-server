import { PartialType } from '@nestjs/swagger';
import { CreateTrainBillDto } from './create-train-bill.dto';

export class UpdateTrainBillDto extends PartialType(CreateTrainBillDto) {}
