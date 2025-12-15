import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from './entities/feedback.entity';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { User } from '../user/entities/user.entity';
import { Destination } from '../destination/entities/destinations.entity';
import { TravelRoute } from '../travel-route/entities/travel-route.entity';
import { RentalVehicle } from '../rental-vehicle/entities/rental-vehicle.entity';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [
    HttpModule,
    CloudinaryModule,
    TypeOrmModule.forFeature([
      Feedback,
      User,
      Destination,
      TravelRoute,
      RentalVehicle,
      Cooperation,
    ]),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
