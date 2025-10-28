import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotelBill } from './hotel-bill.entity';
import { HotelBillDetail } from './hotel-bill-detail.entity';
import { HotelBillsService } from './hotel-bills.service';
import { HotelBillsController } from './hotel-bills.controller';
import { HotelRoom } from '../hotel-rooms/hotel-room.entity';
import { User } from '../users/entities/user.entity';
import { Cooperation } from '../cooperations/cooperation.entity';
import { Voucher } from '../vouchers/voucher.entity';
import { HotelRoomsModule } from '../hotel-rooms/hotel-rooms.module';
import { CooperationsModule } from '../cooperations/cooperations.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HotelBill,
      HotelBillDetail,
      HotelRoom,
      User,
      Cooperation,
      Voucher,
    ]),
    HotelRoomsModule,
    CooperationsModule,
    VouchersModule,
  ],
  controllers: [HotelBillsController],
  providers: [HotelBillsService],
  exports: [HotelBillsService],
})
export class HotelBillsModule {}
