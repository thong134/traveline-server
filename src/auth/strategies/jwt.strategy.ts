// src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: number;
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // lấy token từ header Authorization
      ignoreExpiration: false, // không bỏ qua kiểm tra hết hạn
      secretOrKey: process.env.JWT_SECRET || 'uittraveline', // secret key để verify token
      // nếu dùng publicKey thì thêm algorithms: ['RS256'] (hoặc thuật toán bạn dùng để sign)
    });
  }

  validate(payload: JwtPayload) {
    // payload là dữ liệu giải mã từ JWT
    // payload = { username: '...', sub: '...' }
    // sub là userId theo chuẩn của JWT
    // hàm này sẽ được gọi tự động khi token hợp lệ và giá trị trả về sẽ được gán vào request.user
    // ở đây có thể return userId, email, role...
    return { userId: payload.sub, username: payload.username };
  }
}
