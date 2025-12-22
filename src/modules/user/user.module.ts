import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './user.service';
import { UsersController } from './user.controller';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { VerifiedUserGuard } from './guards/verified-user.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CloudinaryModule],
  controllers: [UsersController],
  providers: [UsersService, VerifiedUserGuard],
  exports: [UsersService, VerifiedUserGuard, TypeOrmModule],
})
export class UsersModule {}
