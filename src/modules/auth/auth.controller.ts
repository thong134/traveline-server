import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PhoneStartDto } from './dto/phone-start.dto';
import { PhoneVerifyDto } from './dto/phone-verify.dto';
import { EmailStartDto } from './dto/email-start.dto';
import { EmailVerifyDto } from './dto/email-verify.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { AuthTokens } from './dto/auth-tokens.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { RequireAuth } from './decorators/require-auth.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './decorators/current-user.decorator';
import { imageMulterOptions } from '../../common/upload/image-upload.config';
import { UserRole } from '../user/entities/user-role.enum';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: number;
    username: string;
    role: UserRole;
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiCreatedResponse({ description: 'Signup successful' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập và cấp token' })
  @ApiOkResponse({ description: 'Login successful' })
  async login(@Body() dto: LoginDto): Promise<AuthTokens> {
    const user = await this.authService.validateUser(
      dto.username,
      dto.password,
    );
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Làm mới access token' })
  @ApiOkResponse({ description: 'New access token issued' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('request-reset')
  @ApiOperation({ summary: 'Yêu cầu email đặt lại mật khẩu' })
  @ApiOkResponse({ description: 'Reset email sent when account exists' })
  async requestReset(@Body() dto: RequestResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { ok: true };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng mã trong email' })
  @ApiOkResponse({ description: 'Password reset success' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @RequireAuth()
  @Post('email/start')
  @ApiOperation({ summary: 'Gửi mã xác thực email' })
  @ApiOkResponse({ description: 'Mã xác thực đã gửi' })
  async emailStart(@CurrentUser() user: RequestUser) {
    return this.authService.startEmailVerification(user.userId);
  }

  @Post('email/verify')
  @ApiOperation({ summary: 'Xác thực email bằng mã' })
  @ApiOkResponse({ description: 'Email verified' })
  async emailVerify(@Body() dto: EmailVerifyDto) {
    return this.authService.verifyEmailCode(dto);
  }

  @RequireAuth()
  @Post('phone/start')
  @ApiOperation({ summary: 'Bắt đầu xác thực số điện thoại' })
  @ApiOkResponse({ description: 'OTP sent or logged for development' })
  async phoneStart(
    @CurrentUser() user: RequestUser,
    @Body() dto: PhoneStartDto,
  ) {
    return this.authService.startPhoneVerification(
      user.userId,
      dto.recaptchaToken,
    );
  }

  @Post('phone/verify')
  @ApiOperation({ summary: 'Xác thực số điện thoại bằng OTP' })
  @ApiOkResponse({ description: 'Phone verified' })
  async phoneVerify(@Body() dto: PhoneVerifyDto) {
    return this.authService.verifyPhoneCode(
      dto.phone,
      dto.sessionInfo,
      dto.code,
    );
  }

  @RequireAuth()
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại' })
  @ApiOkResponse({ description: 'Authenticated user payload' })
  async profile(@CurrentUser() user: RequestUser) {
    const detail = await this.authService['usersService'].findOne(user.userId);
    const { password: _password, ...rest } = detail;
    return rest;
  }

  @RequireAuth()
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thu hồi refresh token của người dùng hiện tại' })
  @ApiOkResponse({ description: 'Logout confirmation' })
  async logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user.userId);
  }

  @Patch('password')
  @RequireAuth()
  @ApiOperation({ summary: 'Thay đổi mật khẩu tài khoản' })
  @ApiOkResponse({ description: 'Đổi mật khẩu thành công' })
  changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, dto);
  }


  @Post('citizen-id/verify')
  @RequireAuth()
  @ApiOperation({ summary: 'Xác thực căn cước công dân (Placeholder)' })
  @ApiOkResponse({ description: 'Xác thực thành công' })
  async verifyCitizenId(@CurrentUser() user: RequestUser) {
    // In production, this would involve OCR/AI scanning of the ID card image
    await this.authService['usersService'].markCitizenIdVerified(user.userId);
    return { ok: true, message: 'Căn cước công dân đã được xác thực' };
  }
}
