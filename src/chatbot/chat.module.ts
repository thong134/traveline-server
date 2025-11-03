import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Destination } from '../destinations/destinations.entity';
import { Cooperation } from '../cooperations/cooperation.entity';
import { ChatCache } from './chat-cache.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Destination, Cooperation, ChatCache]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
