import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chatbot.controller';
import { ChatService } from './chatbot.service';
import { Destination } from '../destination/entities/destinations.entity';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { ChatCache } from './entities/chat-cache.entity';

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
