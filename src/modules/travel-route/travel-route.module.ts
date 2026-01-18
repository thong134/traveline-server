import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelRoutesService } from './travel-route.service';
import { TravelRoutesController } from './travel-route.controller';
import { TravelRoute } from './entities/travel-route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { Destination } from '../destination/entities/destinations.entity';
import { User } from '../user/entities/user.entity';
import { Notification } from '../notification/entities/notification.entity';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { TravelRouteCronService } from './travel-route.cron';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TravelRoute, RouteStop, Destination, User, Notification]),
    CloudinaryModule,
    forwardRef(() => NotificationModule),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rawUrl =
          configService.get<string>('AI_SERVICE_URL') ??
          'https://ai-model-service-u3xb.onrender.com';
        return {
          baseURL: rawUrl.replace(/\/+$/, ''),
          timeout: 90_000,
          maxRedirects: 2,
        };
      },
    }),
  ],
  controllers: [TravelRoutesController],
  providers: [TravelRoutesService, TravelRouteCronService],
  exports: [TravelRoutesService],
})
export class TravelRoutesModule {}
