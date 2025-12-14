import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../../user/entities/user-role.enum';

/**
 * Combines the JWT guard with the matching Swagger metadata so protected
 * endpoints enforce authentication and display the lock icon in docs.
 */
export function RequireAuth(
  ...roles: UserRole[]
): MethodDecorator & ClassDecorator {
  const decorators: Array<ClassDecorator | MethodDecorator> = [
    ApiBearerAuth(),
    UseGuards(JwtAuthGuard),
  ];

  if (roles.length > 0) {
    decorators.push(Roles(...roles));
  }

  return applyDecorators(...decorators);
}
