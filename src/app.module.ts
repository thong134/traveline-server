import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DestinationsModule } from './destinations/destinations.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProvincesModule } from './provinces/provinces.module';
import { TravelRoutesModule } from './travel-routes/travel-routes.module';
import { FeedbackModule } from './feedback/feedback.module';
import { VehicleCatalogModule } from './vehicle-catalog/vehicle-catalog.module';
import { RentalContractsModule } from './rental-contracts/rental-contracts.module';
import { RentalVehiclesModule } from './rental-vehicles/rental-vehicles.module';
import { RentalBillsModule } from './rental-bills/rental-bills.module';
import { CooperationsModule } from './cooperations/cooperations.module';
import { HotelRoomsModule } from './hotel-rooms/hotel-rooms.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { HotelBillsModule } from './hotel-bills/hotel-bills.module';
import { DeliveryModule } from './delivery/delivery.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { BusModule } from './bus/bus.module';
import { TrainModule } from './train/train.module';
import { FlightModule } from './flight/flight.module';
import { ChatModule } from './chatbot/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        // host: process.env.DB_HOST,
        // port: Number(process.env.DB_PORT),
        // username: process.env.DB_USER,
        // password: process.env.DB_PASS,
        // database: process.env.DB_NAME,
        autoLoadEntities: true,
        synchronize: true, // tự tạo bảng dựa trên entity (dev thôi, production thì nên tắt)
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 10 }]),
    DestinationsModule,
    AuthModule,
    UsersModule,
    ProvincesModule,
    TravelRoutesModule,
    FeedbackModule,
    VehicleCatalogModule,
    RentalContractsModule,
    RentalVehiclesModule,
    RentalBillsModule,
    CooperationsModule,
    HotelRoomsModule,
    VouchersModule,
    HotelBillsModule,
    DeliveryModule,
    RestaurantModule,
    BusModule,
    TrainModule,
    FlightModule,
    ChatModule,
  ],
})
export class AppModule {}
