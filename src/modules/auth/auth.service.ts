import {
  BadRequestException,
  ConflictException,
  Injectable,
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
import { sendResetEmail } from './utils/mail.util';
import { UsersService } from '../user/user.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { PhoneOtp } from './entities/phone-otp.entity';
import { SignupDto } from './dto/signup.dto';
import { User } from '../user/entities/user.entity';
import type { AuthTokens } from './dto/auth-tokens.dto';

type SafeUser = Pick<User, 'id' | 'username'>;

interface JwtPayload {
  sub: number;
  username: string;
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
export class AuthService {
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
  ) {}

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
    const secret = this.configService.get<string>('JWT_SECRET')?.trim();
    return secret && secret.length > 0 ? secret : 'uittraveline';
  }

  private getRefreshTokenSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET')?.trim();
    return secret && secret.length > 0 ? secret : this.getAccessTokenSecret();
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

  async signup(dto: SignupDto): Promise<{ id: number; username: string }> {
    const existing = await this.usersService.findByUsername(dto.username);
    if (existing) throw new ConflictException('Username already exists');

    const hashed = await hash(dto.password, 10);
    const user = await this.usersService.create({
      username: dto.username,
      password: hashed,
    });
    return { id: user.id, username: user.username };
  }

  async validateUser(username: string, pass: string): Promise<SafeUser | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await compare(pass, user.password);
    if (!isValid) {
      return null;
    }

    return { id: user.id, username: user.username };
  }

  async login(user: SafeUser): Promise<AuthTokens> {
    const payload: JwtPayload = { username: user.username, sub: user.id };

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
        { sub: payload.sub, username: payload.username },
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

  // request reset: generate token, save hash, send email (do not reveal if email exists)
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // Always return 200 to not reveal whether email exists
    if (!user) {
      // Optionally log
      return;
    }

    // create a secure random token (plaintext will be sent by email)
    const token = randomBytes(32).toString('hex'); // 64 chars
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

    // build reset link to frontend
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}&uid=${user.id}`;
    // send email (see util)
    await sendResetEmail(user.email, link);
  }

  // reset password: client sends token + newPassword
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ ok: boolean }> {
    // Find all not-used token rows not expired (small) — we must compare hashed token
    const now = new Date();
    const rows = await this.passwordResetRepo.find({
      where: { used: false },
    });

    for (const row of rows) {
      const ok = await compare(token, row.tokenHash);
      if (!ok) continue;
      if (row.expiresAt < now) continue; // expired

      // everything good — update user password
      const hashed = await hash(newPassword, 10);
      await this.usersService.updatePassword(row.userId, hashed);

      // mark token used
      row.used = true;
      await this.passwordResetRepo.save(row);

      try {
        await this.refreshTokenRepository.delete({ userId: row.userId });
      } catch {
        // Ignore cleanup errors
      }

      return { ok: true };
    }

    throw new UnauthorizedException('Invalid or expired token');
  }

  async startPhoneVerification(
    phone: string,
    recaptchaToken: string,
  ): Promise<{ ok: boolean; sessionInfo: string; expiresAt: Date }> {
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
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('FIREBASE_API_KEY is not configured');
    }

    // find latest unused OTPs for this phone
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
}
