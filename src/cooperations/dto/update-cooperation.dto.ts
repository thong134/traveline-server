import { PartialType } from '@nestjs/swagger';
import { CreateCooperationDto } from './create-cooperation.dto';

export class UpdateCooperationDto extends PartialType(CreateCooperationDto) {}
