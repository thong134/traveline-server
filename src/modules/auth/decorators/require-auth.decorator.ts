import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Combines the JWT guard with the matching Swagger metadata so protected
 * endpoints enforce authentication and display the lock icon in docs.
 */
export function RequireAuth(): MethodDecorator & ClassDecorator {
  return applyDecorators(ApiBearerAuth(), UseGuards(JwtAuthGuard));
}
