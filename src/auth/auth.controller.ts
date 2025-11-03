import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PhoneStartDto } from './dto/phone-start.dto';
import { PhoneVerifyDto } from './dto/phone-verify.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { AuthTokens } from './dto/auth-tokens.dto';
import type { AuthenticatedRequest } from './types/authenticated-request';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new account' })
  @ApiCreatedResponse({ description: 'Signup successful' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user and issue tokens' })
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
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkResponse({ description: 'New access token issued' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('request-reset')
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiOkResponse({ description: 'Reset email sent when account exists' })
  async requestReset(@Body() dto: RequestResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { ok: true };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using emailed token' })
  @ApiOkResponse({ description: 'Password reset success' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('phone/start')
  @ApiOperation({ summary: 'Start phone verification' })
  @ApiOkResponse({ description: 'OTP sent or logged for development' })
  async phoneStart(@Body() dto: PhoneStartDto) {
    return this.authService.startPhoneVerification(
      dto.phone,
      dto.recaptchaToken,
    );
  }

  @Post('phone/verify')
  @ApiOperation({ summary: 'Verify phone with OTP' })
  @ApiOkResponse({ description: 'Phone verified' })
  async phoneVerify(@Body() dto: PhoneVerifyDto) {
    return this.authService.verifyPhoneCode(
      dto.phone,
      dto.sessionInfo,
      dto.code,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'Authenticated user payload' })
  profile(@Request() req: AuthenticatedRequest) {
    return req.user; // từ JwtStrategy.validate()
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke refresh tokens for current user' })
  @ApiOkResponse({ description: 'Logout confirmation' })
  async logout(@Request() req: AuthenticatedRequest) {
    return this.authService.logout(req.user.userId);
  }
}
