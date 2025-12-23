import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateVoucherDto } from './create-voucher.dto';

// Active is controlled by business rules (expiry/usage) and cannot be patched directly
export class UpdateVoucherDto extends PartialType(
	OmitType(CreateVoucherDto, ['active'] as const),
) {}
