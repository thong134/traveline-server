import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { ConfigModule } from '@nestjs/config';
import { Notification } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';
import { NotificationController } from './notification.controller';

@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Notification, User])],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
