import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantTable } from './table/entities/restaurant-table.entity';
import { RestaurantBooking } from './booking/entities/restaurant-booking.entity';
import { RestaurantTablesService } from './table/restaurant-tables.service';
import { RestaurantBookingsService } from './booking/restaurant-booking.service';
import { RestaurantTablesController } from './table/restaurant-tables.controller';
import { RestaurantBookingsController } from './booking/restaurant-booking.controller';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { User } from '../user/entities/user.entity';
import { CooperationsModule } from '../cooperation/cooperation.module';

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
