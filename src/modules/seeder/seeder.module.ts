import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder.service';
import { SeederController } from './seeder.controller';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { HotelRoom } from '../hotel/room/entities/hotel-room.entity';
import { RestaurantTable } from '../restaurant/table/entities/restaurant-table.entity';
import { DeliveryVehicle } from '../delivery/delivery-vehicle/entities/delivery-vehicle.entity';
import { BusType } from '../bus/bus/entities/bus-type.entity';
import { TrainRoute } from '../train/train/entities/train-route.entity';
import { Flight } from '../flight/flight/entities/flight.entity';
import { Destination } from '../destination/entities/destinations.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cooperation,
      HotelRoom,
      RestaurantTable,
      DeliveryVehicle,
      BusType,
      TrainRoute,
      Flight,
      Destination,
      User,
    ]),
  ],
  controllers: [SeederController],
  providers: [SeederService],
})
export class SeederModule {}
