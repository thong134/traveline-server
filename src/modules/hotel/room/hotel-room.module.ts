import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotelRoom } from './entities/hotel-room.entity';
import { HotelRoomsService } from './hotel-room.service';
import { HotelRoomsController } from './hotel-room.controller';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { HotelBillDetail } from '../bill/entities/hotel-bill-detail.entity';
import { HotelBill } from '../bill/entities/hotel-bill.entity';
import { User } from '../../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HotelRoom,
      Cooperation,
      HotelBillDetail,
      HotelBill,
      User,
    ]),
  ],
  controllers: [HotelRoomsController],
  providers: [HotelRoomsService],
  exports: [HotelRoomsService],
})
export class HotelRoomsModule {}
