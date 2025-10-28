import { PartialType } from '@nestjs/swagger';
import { CreateBusTypeDto } from './create-bus-type.dto';

export class UpdateBusTypeDto extends PartialType(CreateBusTypeDto) {}
