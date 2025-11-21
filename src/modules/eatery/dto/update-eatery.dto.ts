import { PartialType } from '@nestjs/swagger';
import { CreateEateryDto } from './create-eatery.dto';

export class UpdateEateryDto extends PartialType(CreateEateryDto) {}
