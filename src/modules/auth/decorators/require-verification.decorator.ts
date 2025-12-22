import { UseGuards, applyDecorators } from '@nestjs/common';
import { VerifiedUserGuard } from '../../user/guards/verified-user.guard';

export function RequireVerification() {
  return applyDecorators(UseGuards(VerifiedUserGuard));
}
