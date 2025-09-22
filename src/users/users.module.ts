import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // nạp entity User
  providers: [UsersService],
  exports: [UsersService], // để AuthService có thể gọi UsersService
})
export class UsersModule {}
