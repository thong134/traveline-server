import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../user/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { PhoneOtp } from './entities/phone-otp.entity';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { EateriesModule } from '../eatery/eatery.module';
import { CooperationsModule } from '../cooperation/cooperation.module';
import { WalletModule } from '../wallet/wallet.module';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    UsersModule,
    EateriesModule,
    CooperationsModule,
    WalletModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'uittraveline',
      signOptions: { expiresIn: '1h' },
    }),
    TypeOrmModule.forFeature([RefreshToken]),
    TypeOrmModule.forFeature([PasswordReset]),
    TypeOrmModule.forFeature([PhoneOtp]),
    CloudinaryModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, UsersModule],
})
export class AuthModule {}
