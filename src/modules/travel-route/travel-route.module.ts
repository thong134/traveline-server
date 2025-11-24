import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelRoutesService } from './travel-route.service';
import { TravelRoutesController } from './travel-route.controller';
import { TravelRoute } from './entities/travel-route.entity';
import { RouteStop } from './entities/route-stop.entity';
import { Destination } from '../destination/entities/destinations.entity';
import { User } from '../user/entities/user.entity';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TravelRoute, RouteStop, Destination, User]),
    CloudinaryModule,
  ],
  controllers: [TravelRoutesController],
  providers: [TravelRoutesService],
  exports: [TravelRoutesService],
})
export class TravelRoutesModule {}
