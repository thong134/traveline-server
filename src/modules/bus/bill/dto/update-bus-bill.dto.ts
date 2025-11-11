import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateBusBillDto } from './create-bus-bill.dto';

export class UpdateBusBillDto extends PartialType(CreateBusBillDto) {
	@ApiPropertyOptional({ description: 'Whether travel points have been refunded' })
	@IsOptional()
	@IsBoolean()
	travelPointsRefunded?: boolean;
}
