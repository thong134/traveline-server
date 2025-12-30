import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ChatController } from './chatbot.controller';
import { ChatService } from './chatbot.service';
import { Destination } from '../destination/entities/destinations.entity';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { ChatCache } from './entities/chat-cache.entity';
import { ChatUserProfile } from './entities/chat-user-profile.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../user/entities/user.entity';
import { TravelRoute } from '../travel-route/entities/travel-route.entity';
import { RouteStop } from '../travel-route/entities/route-stop.entity';
import { BusType } from '../bus/bus/entities/bus-type.entity';
import { TrainRoute } from '../train/train/entities/train-route.entity';
import { Flight } from '../flight/flight/entities/flight.entity';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    CloudinaryModule,
    TypeOrmModule.forFeature([
      Destination,
      Cooperation,
      ChatCache,
      ChatUserProfile,
      ChatMessage,
      User,
      TravelRoute,
      RouteStop,
      BusType,
      TrainRoute,
      Flight,
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
