import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotelRoom } from './hotel-room.entity';
import { HotelRoomsService } from './hotel-rooms.service';
import { HotelRoomsController } from './hotel-rooms.controller';
import { Cooperation } from '../cooperations/cooperation.entity';
import { HotelBillDetail } from '../hotel-bills/hotel-bill-detail.entity';
import { HotelBill } from '../hotel-bills/hotel-bill.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HotelRoom,
      Cooperation,
      HotelBillDetail,
      HotelBill,
    ]),
  ],
  controllers: [HotelRoomsController],
  providers: [HotelRoomsService],
  exports: [HotelRoomsService],
})
export class HotelRoomsModule {}
