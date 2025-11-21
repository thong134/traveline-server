import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { AuthTokens } from './dto/auth-tokens.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequireAuth } from './decorators/require-auth.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './decorators/current-user.decorator';
import type { UploadedAvatarFile } from './types/uploaded-file.type';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: number;
    username: string;
  };
}

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

  @Patch('profile')
  @RequireAuth()
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cập nhật thông tin người dùng' })
  @ApiOkResponse({ description: 'Thông tin người dùng đã được cập nhật' })
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() avatar?: UploadedAvatarFile,
  ) {
    return this.authService.updateProfile(user.userId, dto, avatar);
  }

//   @Post('favorites/eateries/:eateryId')
//   @RequireAuth()
//   @ApiOperation({ summary: 'Thêm quán ăn vào danh sách yêu thích' })
//   @ApiOkResponse({ description: 'Đã thêm quán ăn vào yêu thích' })
//   addFavoriteEatery(
//     @CurrentUser() user: RequestUser,
//     @Param('eateryId', ParseIntPipe) eateryId: number,
//   ) {
//     return this.authService.favoriteEatery(user.userId, eateryId);
//   }

//   @Delete('favorites/eateries/:eateryId')
//   @RequireAuth()
//   @ApiOperation({ summary: 'Bỏ quán ăn khỏi danh sách yêu thích' })
//   @ApiOkResponse({ description: 'Đã bỏ quán ăn khỏi yêu thích' })
//   removeFavoriteEatery(
//     @CurrentUser() user: RequestUser,
//     @Param('eateryId', ParseIntPipe) eateryId: number,
//   ) {
//     return this.authService.unfavoriteEatery(user.userId, eateryId);
//   }

//   @Post('favorites/cooperations/:cooperationId')
//   @RequireAuth()
//   @ApiOperation({ summary: 'Thêm đối tác vào danh sách yêu thích' })
//   @ApiOkResponse({ description: 'Đã thêm đối tác vào yêu thích' })
//   addFavoriteCooperation(
//     @CurrentUser() user: RequestUser,
//     @Param('cooperationId', ParseIntPipe) cooperationId: number,
//   ) {
//     return this.authService.favoriteCooperation(user.userId, cooperationId);
//   }

//   @Delete('favorites/cooperations/:cooperationId')
//   @RequireAuth()
//   @ApiOperation({ summary: 'Bỏ đối tác khỏi danh sách yêu thích' })
//   @ApiOkResponse({ description: 'Đã bỏ đối tác khỏi yêu thích' })
//   removeFavoriteCooperation(
//     @CurrentUser() user: RequestUser,
//     @Param('cooperationId', ParseIntPipe) cooperationId: number,
//   ) {
//     return this.authService.unfavoriteCooperation(user.userId, cooperationId);
//   }
}
