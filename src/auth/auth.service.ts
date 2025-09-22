import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { RefreshToken } from './dto/refresh-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.usersService.findByUsername(dto.username);
    if (existing) throw new ConflictException('Username already exists');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({ username: dto.username, password: hashed });
    return { id: user.id, username: user.username };
  }

  async validateUser(username: string, pass: string) {
    const user = await this.usersService.findByUsername(username);
    if (user && await bcrypt.compare(pass, user.password)) {
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

    await this.refreshTokenRepository.delete({ user: { id: user.id } });

    const rt = this.refreshTokenRepository.create({
      user: { id: user.id } as any,
      token: hashed,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await this.refreshTokenRepository.save(rt);
    
    return {
      access_token: accessToken, refreshToken
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

  async logout(userId: number) {
    await this.refreshTokenRepository.delete({ userId });
    return { message: 'Logged out' };
  }
}
