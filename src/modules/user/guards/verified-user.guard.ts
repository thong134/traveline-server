import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { UsersService } from '../user.service';

@Injectable()
export class VerifiedUserGuard implements CanActivate {
  constructor(private readonly moduleRef: ModuleRef) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const usersService = this.moduleRef.get(UsersService, { strict: false });
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      return false;
    }

    const userDetail = await usersService.findOne(user.userId);

    if (!userDetail.isEmailVerified) {
      throw new ForbiddenException('Email của bạn chưa được xác thực');
    }
    if (!userDetail.isPhoneVerified) {
      throw new ForbiddenException('Số điện thoại của bạn chưa được xác thực');
    }
    if (!userDetail.isCitizenIdVerified) {
      throw new ForbiddenException('Căn cước công dân của bạn chưa được xác thực');
    }

    return true;
  }
}
