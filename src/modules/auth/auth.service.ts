import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { addDays, addMinutes } from 'date-fns';
import { Repository } from 'typeorm';
import { sendEmailVerificationEmail, sendResetEmail } from './utils/mail.util';
import { UsersService } from '../user/user.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { PhoneOtp } from './entities/phone-otp.entity';
import { SignupDto } from './dto/signup.dto';
import { User } from '../user/entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import type { ProfileUpdateInput } from '../user/user.service';
import { EateriesService } from '../eatery/eatery.service';
import { CooperationsService } from '../cooperation/cooperation.service';
import { WalletService } from '../wallet/wallet.service';
import type { AuthTokens } from './dto/auth-tokens.dto';
import type { Express } from 'express';
import { assertImageFile } from '../../common/upload/image-upload.utils';
import { UserRole } from '../user/entities/user-role.enum';
import { EmailVerifyDto } from './dto/email-verify.dto';

type SafeUser = Pick<User, 'id' | 'username' | 'role'>;

interface JwtPayload {
  sub: number;
  username: string;
  role: UserRole;
}

interface FirebaseSendVerificationResponse {
  sessionInfo?: string;
}

interface FirebaseSignInResponse {
  phoneNumber?: string;
}

interface FirebaseErrorResponse {
  error?: {
    message?: string;
    status?: string;
  };
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepo: Repository<PasswordReset>,
    private readonly jwtService: JwtService,
    @InjectRepository(PhoneOtp)
    private phoneOtpRepo: Repository<PhoneOtp>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly eateriesService: EateriesService,
    private readonly cooperationsService: CooperationsService,
    private readonly walletService: WalletService,
  ) {}

  private readonly rateBuckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  async onModuleInit(): Promise<void> {
    await this.ensureDefaultAdminAccount();
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new Error(`${key} is required but not configured`);
    }
    return value;
  }

  private checkRate(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const bucket = this.rateBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      this.rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (bucket.count + 1 > limit) {
      const waitSec = Math.ceil((bucket.resetAt - now) / 1000);
      throw new HttpException(
        `Thao tác quá nhiều, thử lại sau ${waitSec}s`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    bucket.count += 1;
    this.rateBuckets.set(key, bucket);
  }

  private getNumberConfig(key: string, fallback: number): number {
    const value = this.configService.get<string | number | undefined>(key);
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return fallback;
  }

  private getOtpExpiresMinutes(): number {
    return this.getNumberConfig('OTP_EXPIRES_MIN', 5);
  }

  private getAccessTokenSecret(): string {
    return this.requireConfig('JWT_SECRET');
  }

  private getRefreshTokenSecret(): string {
    return this.requireConfig('JWT_REFRESH_SECRET');
  }

  private getAccessTokenTtl(): string {
    return this.configService.get<string>('JWT_ACCESS_EXPIRES') ?? '15m';
  }

  private getRefreshTokenTtl(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES') ?? '30d';
  }

  private getRefreshTokenStoreDays(): number {
    return this.getNumberConfig('REFRESH_TOKEN_STORE_DAYS', 30);
  }

  private getEmailVerifySecret(): string {
    return this.requireConfig('EMAIL_VERIFY_SECRET');
  }

  private getEmailVerifyExpiresMinutes(): number {
    return this.getNumberConfig('EMAIL_VERIFY_EXPIRES_MIN', 10);
  }

  async signup(dto: SignupDto): Promise<{ id: number; username: string; role: UserRole }> {
    const existing = await this.usersService.findByUsername(dto.username);
    if (existing) throw new ConflictException('Username already exists');

    const hashed = await hash(dto.password, 10);
    const user = await this.usersService.create({
      username: dto.username,
      password: hashed,
      role: UserRole.User,
    });
    await this.walletService.createWallet(user.id);
    return { id: user.id, username: user.username, role: user.role };
  }

  async validateUser(username: string, pass: string): Promise<SafeUser | null> {
    this.checkRate(`login:${username}`, 5, 10 * 60 * 1000);
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await compare(pass, user.password);
    if (!isValid) {
      return null;
    }

    return { id: user.id, username: user.username, role: user.role };
  }

  async login(user: SafeUser): Promise<AuthTokens> {
    const payload: JwtPayload = {
      username: user.username,
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.getAccessTokenSecret(),
      expiresIn: this.getAccessTokenTtl(),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.getRefreshTokenSecret(),
      expiresIn: this.getRefreshTokenTtl(),
    });

    const hashedRefresh = await hash(refreshToken, 10);

    await this.refreshTokenRepository.delete({ userId: user.id });

    const rt = this.refreshTokenRepository.create({
      userId: user.id,
      token: hashedRefresh,
      expiresAt: addDays(new Date(), this.getRefreshTokenStoreDays()),
    });
    await this.refreshTokenRepository.save(rt);

    return {
      access_token: accessToken,
      refreshToken,
      role: user.role,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.getRefreshTokenSecret(),
      });

      const tokens = await this.refreshTokenRepository.find({
        where: { userId: payload.sub },
      });

      let isValid = false;
      for (const token of tokens) {
        const matches = await compare(refreshToken, token.token);
        if (matches && token.expiresAt > new Date()) {
          isValid = true;
          break;
        }
      }

      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = this.jwtService.sign(
        { sub: payload.sub, username: payload.username, role: payload.role },
        {
          secret: this.getAccessTokenSecret(),
          expiresIn: this.getAccessTokenTtl(),
        },
      );

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async startEmailVerification(
    email: string,
  ): Promise<{ ok: boolean; token: string; expiresAt: Date }> {
    this.checkRate(`email:start:${email}`, 5, 60 * 60 * 1000);
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email không tồn tại');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresMin = this.getEmailVerifyExpiresMinutes();
    const expiresAt = addMinutes(new Date(), expiresMin);

    const token = this.jwtService.sign(
      { email, code },
      {
        secret: this.getEmailVerifySecret(),
        expiresIn: `${expiresMin}m`,
      },
    );

    await sendEmailVerificationEmail(email, code);
    return { ok: true, token, expiresAt };
  }

  async verifyEmailCode(dto: EmailVerifyDto): Promise<{ ok: boolean }> {
    this.checkRate(`email:verify:${dto.email}`, 10, 60 * 60 * 1000);
    let payload: { email: string; code: string };
    try {
      payload = this.jwtService.verify<{ email: string; code: string }>(
        dto.token,
        {
          secret: this.getEmailVerifySecret(),
        },
      );
    } catch {
      throw new UnauthorizedException(
        'Mã xác thực không hợp lệ hoặc đã hết hạn',
      );
    }

    if (payload.email !== dto.email || payload.code !== dto.code) {
      throw new UnauthorizedException('Mã xác thực không hợp lệ');
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    await this.usersService.markEmailVerified(user.id, dto.email);
    return { ok: true };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = await hash(token, 10);

    const expiresMinutes = Number(
      process.env.PASSWORD_RESET_TOKEN_EXPIRES_MIN || 60,
    );
    const expiresAt = addMinutes(new Date(), expiresMinutes);

    const entity = this.passwordResetRepo.create({
      tokenHash,
      userId: user.id,
      expiresAt,
      used: false,
    });
    await this.passwordResetRepo.save(entity);

    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}&uid=${user.id}`;
    await sendResetEmail(user.email, link);
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ ok: boolean }> {
    const now = new Date();
    const rows = await this.passwordResetRepo.find({
      where: { used: false },
    });

    for (const row of rows) {
      const ok = await compare(token, row.tokenHash);
      if (!ok) continue;
      if (row.expiresAt < now) continue;

      const hashed = await hash(newPassword, 10);
      await this.usersService.updatePassword(row.userId, hashed);

      row.used = true;
      await this.passwordResetRepo.save(row);

      try {
        await this.refreshTokenRepository.delete({ userId: row.userId });
      } catch {
        // ignore
      }

      return { ok: true };
    }

    throw new UnauthorizedException('Invalid or expired token');
  }

  async startPhoneVerification(
    phone: string,
    recaptchaToken: string,
  ): Promise<{ ok: boolean; sessionInfo: string; expiresAt: Date }> {
    this.checkRate(`phone:start:${phone}`, 5, 60 * 60 * 1000);
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('FIREBASE_API_KEY is not configured');
    }
    if (!recaptchaToken) {
      throw new BadRequestException('recaptchaToken is required');
    }

    try {
      const response = await axios.post<FirebaseSendVerificationResponse>(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
        {
          phoneNumber: phone,
          recaptchaToken,
        },
      );

      const { sessionInfo } = response.data;
      if (!sessionInfo) {
        throw new UnauthorizedException('Firebase did not return sessionInfo');
      }

      const expiresMin = this.getOtpExpiresMinutes();
      const expiresAt = addMinutes(new Date(), expiresMin);
      const sessionHash = await hash(sessionInfo, 8);

      const otp = this.phoneOtpRepo.create({
        phone,
        sessionHash,
        expiresAt,
        used: false,
      });
      await this.phoneOtpRepo.save(otp);

      return { ok: true, sessionInfo, expiresAt };
    } catch (error: unknown) {
      if (axios.isAxiosError<FirebaseErrorResponse>(error)) {
        const firebaseError = error.response?.data?.error;
        const message =
          firebaseError?.message ||
          firebaseError?.status ||
          'Failed to initiate phone verification';
        throw new UnauthorizedException(message);
      }
      throw new UnauthorizedException('Failed to initiate phone verification');
    }
  }

  async verifyPhoneCode(
    phone: string,
    sessionInfo: string,
    code: string,
  ): Promise<{ ok: boolean; phoneNumber: string }> {
    this.checkRate(`phone:verify:${phone}`, 10, 60 * 60 * 1000);
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('FIREBASE_API_KEY is not configured');
    }

    const rows = await this.phoneOtpRepo.find({
      where: { phone, used: false },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    let matched: PhoneOtp | null = null;
    for (const row of rows) {
      if (row.expiresAt < now) continue;
      const ok = await compare(sessionInfo, row.sessionHash);
      if (ok) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    try {
      const response = await axios.post<FirebaseSignInResponse>(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`,
        {
          sessionInfo,
          code,
        },
      );

      const { phoneNumber } = response.data;

      matched.used = true;
      await this.phoneOtpRepo.save(matched);

      const normalizedPhone = phoneNumber ?? phone;
      const user = await this.usersService.findByPhone(normalizedPhone);
      if (user) {
        await this.usersService.markPhoneVerified(user.id);
      }

      return { ok: true, phoneNumber: normalizedPhone };
    } catch (error: unknown) {
      if (axios.isAxiosError<FirebaseErrorResponse>(error)) {
        const firebaseError = error.response?.data?.error;
        const message =
          firebaseError?.message ||
          firebaseError?.status ||
          'Invalid verification code';
        throw new UnauthorizedException(message);
      }
      throw new UnauthorizedException('Invalid verification code');
    }
  }

  async logout(userId: number): Promise<{ message: string }> {
    await this.refreshTokenRepository.delete({ userId });
    return { message: 'Logged out' };
  }

  private async ensureDefaultAdminAccount(): Promise<void> {
    const username =
      this.configService.get<string>('DEFAULT_ADMIN_USERNAME')?.trim() ||
      'admin';
    const email = this.configService.get<string>('DEFAULT_ADMIN_EMAIL');
    const fullName =
      this.configService.get<string>('DEFAULT_ADMIN_FULL_NAME')?.trim() ||
      'Traveline Admin';

    const passwordConfig = this.configService
      .get<string>('DEFAULT_ADMIN_PASSWORD')
      ?.trim();

    const password =
      passwordConfig && passwordConfig.length >= 8
        ? passwordConfig
        : 'Admin@Traveline2025';

    const existing = await this.usersService.findByUsername(username);
    if (existing) {
      if (existing.role !== UserRole.Admin) {
        await this.usersService.update(existing.id, { role: UserRole.Admin });
        this.logger.log(
          `Upgraded existing user "${username}" to admin role during bootstrap`,
        );
      }

      // rotate password if env password differs
      if (passwordConfig && passwordConfig.length >= 8) {
        const same = await compare(passwordConfig, existing.password);
        if (!same) {
          const newHash = await hash(passwordConfig, 10);
          await this.usersService.updatePassword(existing.id, newHash);
          this.logger.warn(
            `Rotated admin password for "${username}" from DEFAULT_ADMIN_PASSWORD env.`,
          );
        }
      }
      return;
    }

    const hashed = await hash(password, 10);
    const admin = await this.usersService.create({
      username,
      password: hashed,
      email: email?.trim(),
      fullName,
      role: UserRole.Admin,
    });

    this.logger.warn(
      `Provisioned default admin account "${username}". Please update DEFAULT_ADMIN_PASSWORD env variable to change the initial password.`,
    );

    await this.walletService.createWallet(admin.id);
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);
    const isMatch = await compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
    }

    const hashed = await hash(dto.newPassword, 10);
    await this.usersService.updatePassword(userId, hashed);
    await this.refreshTokenRepository.delete({ userId });
    return { message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại' };
  }

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
    files: {
      avatar?: Express.Multer.File;
      idCardImage?: Express.Multer.File;
    } = {},
  ): Promise<Omit<User, 'password'>> {
    const payload: ProfileUpdateInput = {
      fullName: dto.fullName,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      address: dto.address,
      nationality: dto.nationality,
      citizenId: dto.citizenId,
      idCardImageUrl: dto.idCardImageUrl,
      bankName: dto.bankName,
      bankAccountNumber: dto.bankAccountNumber,
      bankAccountName: dto.bankAccountName,
    };

    if (files.avatar) {
      assertImageFile(files.avatar, { fieldName: 'avatar' });
      const upload = await this.cloudinaryService.uploadImage(files.avatar, {
        folder: `traveline/users/${userId}`,
        publicId: 'avatar',
      });
      payload.avatarUrl = upload.url;
    }

    if (files.idCardImage) {
      assertImageFile(files.idCardImage, { fieldName: 'idCardImage' });
      const upload = await this.cloudinaryService.uploadImage(
        files.idCardImage,
        {
          folder: `traveline/users/${userId}`,
          publicId: 'id-card',
        },
      );
      payload.idCardImageUrl = upload.url;
    }

    const updated = await this.usersService.updateProfile(userId, payload);
    const { password: _password, ...rest } = updated;
    return rest;
  }

  favoriteEatery(userId: number, eateryId: number) {
    return this.eateriesService.favorite(userId, eateryId);
  }

  unfavoriteEatery(userId: number, eateryId: number) {
    return this.eateriesService.unfavorite(userId, eateryId);
  }

  favoriteCooperation(userId: number, cooperationId: number) {
    return this.cooperationsService.favorite(userId, cooperationId);
  }

  unfavoriteCooperation(userId: number, cooperationId: number) {
    return this.cooperationsService.unfavorite(userId, cooperationId);
  }
}