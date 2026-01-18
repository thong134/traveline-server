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
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationModule } from './modules/notification/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ProvincesModule } from './modules/province/province.module';
import { MapModule } from './common/map/map.module';
import { FptAiModule } from './common/fpt-ai/fpt-ai.module';
import { HealthModule } from './modules/health/health.module';
import { StatisticsModule } from './modules/statistics/statistics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        autoLoadEntities: true,
        synchronize: process.env.VERCEL ? false : true, // Tắt sync trên Vercel để boot nhanh hơn
        ssl: process.env.DATABASE_URL?.includes('render.com') || process.env.DATABASE_URL?.includes('neon.tech') 
          ? { rejectUnauthorized: false } 
          : false,
        timezone: 'Asia/Ho_Chi_Minh',
        extra: {
          options: '-c timezone=Asia/Ho_Chi_Minh',
        },
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
    ScheduleModule.forRoot(),
    NotificationModule,
    PaymentModule,
    ProvincesModule,
    MapModule,
    FptAiModule,
    StatisticsModule,
    HealthModule,
  ],
})
export class AppModule {}
