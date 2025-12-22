import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelRoutesService } from './travel-route.service';
import { TravelRoutesController } from './travel-route.controller';
import { TravelRoute } from './entities/travel-route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { Destination } from '../destination/entities/destinations.entity';
import { User } from '../user/entities/user.entity';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { TravelRouteCronService } from './travel-route.cron';

@Module({
  imports: [
    TypeOrmModule.forFeature([TravelRoute, RouteStop, Destination, User]),
    CloudinaryModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>('AI_MODEL_SERVICE_URL') ?? 'http://localhost:8000',
        timeout: 10_000,
        maxRedirects: 2,
      }),
    }),
  ],
  controllers: [TravelRoutesController],
  providers: [TravelRoutesService, TravelRouteCronService],
  exports: [TravelRoutesService],
})
export class TravelRoutesModule {}
