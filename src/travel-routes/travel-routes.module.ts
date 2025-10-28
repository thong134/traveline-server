import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelRoutesService } from './travel-routes.service';
import { TravelRoutesController } from './travel-routes.controller';
import { TravelRoute } from './travel-route.entity';
import { RouteStop } from './route-stop.entity';
import { Destination } from '../destinations/destinations.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TravelRoute, RouteStop, Destination, User]),
  ],
  controllers: [TravelRoutesController],
  providers: [TravelRoutesService],
  exports: [TravelRoutesService],
})
export class TravelRoutesModule {}
