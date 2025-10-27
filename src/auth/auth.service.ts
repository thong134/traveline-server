import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { addMinutes } from 'date-fns';
import { Repository } from 'typeorm';
import { sendResetEmail } from '../auth/utils/mail.util';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { PhoneOtp } from './entities/phone-otp.entity';
import { SignupDto } from './dto/signup.dto';

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
  ) {}

  private getOtpExpiresMinutes(): number {
    return Number(process.env.OTP_EXPIRES_MIN || 5);
  }

  async signup(dto: SignupDto) {
    const existing = await this.usersService.findByUsername(dto.username);
    if (existing) throw new ConflictException('Username already exists');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({ username: dto.username, password: hashed });
    return { id: user.id, username: user.username };
  }

  async validateUser(username: string, pass: string) {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    const hashed = await bcrypt.hash(refreshToken, 6);

    await this.refreshTokenRepository.delete({ userId: user.id });

    const rt = this.refreshTokenRepository.create({
      user: { id: user.id } as any,
      token: hashed,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await this.refreshTokenRepository.save(rt);

    return {
      access_token: accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const tokens = await this.refreshTokenRepository.find({
        where: { user: { id: payload.sub } },
        relations: ['user'],
      });

      let isValid = false;
      for (const t of tokens) {
        const ok = await bcrypt.compare(refreshToken, t.token);
        if (ok && t.expiresAt > new Date()) {
          isValid = true;
        }
      }
      if (!isValid) throw new UnauthorizedException();

      const newAccessToken = this.jwtService.sign(
        { sub: payload.sub, username: payload.username },
        { secret: process.env.JWT_SECRET, expiresIn: '15m' },
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
    const tokenHash = await bcrypt.hash(token, 10);

    const expiresMinutes = Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_MIN || 60);
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
  async resetPassword(token: string, newPassword: string): Promise<{ ok: boolean }> {
    // Find all not-used token rows not expired (small) — we must compare hashed token
    const now = new Date();
    const rows = await this.passwordResetRepo.find({
      where: { used: false },
    });

    for (const row of rows) {
      const ok = await bcrypt.compare(token, row.tokenHash);
      if (!ok) continue;
      if (row.expiresAt < now) continue; // expired

      // everything good — update user password
      const hashed = await bcrypt.hash(newPassword, 10);
      await this.usersService.updatePassword(row.userId, hashed);

      // mark token used
      row.used = true;
      await this.passwordResetRepo.save(row);

      await this.refreshTokenRepository.delete({ userId: row.userId }).catch(() => undefined);

      return { ok: true };
    }

    throw new UnauthorizedException('Invalid or expired token');
  }

  async startPhoneVerification(phone: string, recaptchaToken: string) {
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('FIREBASE_API_KEY is not configured');
    }
    if (!recaptchaToken) {
      throw new BadRequestException('recaptchaToken is required');
    }

    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
        {
          phoneNumber: phone,
          recaptchaToken,
        },
      );

      const { sessionInfo } = response.data as { sessionInfo?: string };
      if (!sessionInfo) {
        throw new UnauthorizedException('Firebase did not return sessionInfo');
      }

      const expiresMin = this.getOtpExpiresMinutes();
      const expiresAt = addMinutes(new Date(), expiresMin);
      const sessionHash = await bcrypt.hash(sessionInfo, 8);

      const otp = this.phoneOtpRepo.create({
        phone,
        sessionHash,
        expiresAt,
        used: false,
      });
      await this.phoneOtpRepo.save(otp);

      return { ok: true, sessionInfo, expiresAt };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.error?.message ||
          error.response?.data?.error?.status ||
          'Failed to initiate phone verification';
        throw new UnauthorizedException(message);
      }
      throw error;
    }
  }

  async verifyPhoneCode(phone: string, sessionInfo: string, code: string) {
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
      const ok = await bcrypt.compare(sessionInfo, row.sessionHash);
      if (ok) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`,
        {
          sessionInfo,
          code,
        },
      );

      const { phoneNumber } = response.data as { phoneNumber?: string };

      matched.used = true;
      await this.phoneOtpRepo.save(matched);

      const normalizedPhone = phoneNumber ?? phone;
      const user = await this.usersService.findByPhone(normalizedPhone);
      if (user) {
        await this.usersService.markPhoneVerified(user.id);
      }

      return { ok: true, phoneNumber: normalizedPhone };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.error?.message ||
          error.response?.data?.error?.status ||
          'Invalid verification code';
        throw new UnauthorizedException(message);
      }
      throw error;
    }
  }

  async logout(userId: number) {
    await this.refreshTokenRepository.delete({ userId });
    return { message: 'Logged out' };
  }
}
