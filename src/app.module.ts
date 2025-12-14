import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DestinationsModule } from './modules/destination/destination.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/user/user.module';
import { TravelRoutesModule } from './modules/travel-route/travel-route.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { VehicleCatalogModule } from './modules/vehicle-catalog/vehicle-catalog.module';
import { RentalContractsModule } from './modules/rental-contract/rental-contract.module';
import { RentalVehiclesModule } from './modules/rental-vehicle/rental-vehicle.module';
import { RentalBillsModule } from './modules/rental-bill/rental-bill.module';
import { CooperationsModule } from './modules/cooperation/cooperation.module';
import { HotelRoomsModule } from './modules/hotel/room/hotel-room.module';
import { VouchersModule } from './modules/voucher/voucher.module';
import { HotelBillsModule } from './modules/hotel/bill/hotel-bill.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { BusModule } from './modules/bus/bus.module';
import { TrainModule } from './modules/train/train.module';
import { FlightModule } from './modules/flight/flight.module';
import { ChatModule } from './modules/chatbot/chatbot.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { VnAdministrativeModule } from './modules/vn-administrative/vn-administrative.module';
import { CategoriesModule } from './modules/category/category.module';
import { EateriesModule } from './modules/eatery/eatery.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AdminModule } from './modules/admin/admin.module';

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
        synchronize: false, // tự tạo bảng dựa trên entity (dev thôi, production thì nên tắt)
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 10 }]),
    DestinationsModule,
    AuthModule,
    UsersModule,
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
    BlockchainModule,
    VnAdministrativeModule,
    CategoriesModule,
    EateriesModule,
    WalletModule,
    AdminModule,
  ],
})
export class AppModule {}
