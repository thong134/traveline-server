import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantTable } from './restaurant-table.entity';
import { RestaurantBooking } from './restaurant-booking.entity';
import { RestaurantTablesService } from './restaurant-tables.service';
import { RestaurantBookingsService } from './restaurant-bookings.service';
import { RestaurantTablesController } from './restaurant-tables.controller';
import { RestaurantBookingsController } from './restaurant-bookings.controller';
import { Cooperation } from '../cooperations/cooperation.entity';
import { User } from '../users/entities/user.entity';
import { CooperationsModule } from '../cooperations/cooperations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RestaurantTable,
      RestaurantBooking,
      Cooperation,
      User,
    ]),
    CooperationsModule,
  ],
  controllers: [RestaurantTablesController, RestaurantBookingsController],
  providers: [RestaurantTablesService, RestaurantBookingsService],
  exports: [RestaurantTablesService, RestaurantBookingsService],
})
export class RestaurantModule {}
