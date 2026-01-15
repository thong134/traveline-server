import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { ConfigModule } from '@nestjs/config';
import { Notification } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';
import { NotificationController } from './notification.controller';
import { ReminderCronService } from './reminder.cron';
import { NotificationGateway } from './notification.gateway';
import { TravelRoute } from '../travel-route/entities/travel-route.entity';
import { RentalBill } from '../rental-bill/entities/rental-bill.entity';
import { HotelBill } from '../hotel/bill/entities/hotel-bill.entity';
import { RestaurantBooking } from '../restaurant/booking/entities/restaurant-booking.entity';
import { TravelRoutesModule } from '../travel-route/travel-route.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Notification,
      User,
      TravelRoute,
      RentalBill,
      HotelBill,
      RestaurantBooking,
    ]),
    forwardRef(() => TravelRoutesModule),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, ReminderCronService, NotificationGateway],
  exports: [NotificationService],
})
export class NotificationModule {}
