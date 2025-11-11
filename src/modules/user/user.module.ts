import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './user.service';
import { UsersController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // nạp entity User
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // để AuthService có thể gọi UsersService
})
export class UsersModule {}
