import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from './feedback.entity';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { User } from '../users/entities/user.entity';
import { Destination } from '../destinations/destinations.entity';
import { TravelRoute } from '../travel-routes/travel-route.entity';
import { RentalVehicle } from '../rental-vehicles/rental-vehicle.entity';
import { Cooperation } from '../cooperations/cooperation.entity';

@Module({
  imports: [
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
