import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotelBill } from './entities/hotel-bill.entity';
import { HotelBillDetail } from './entities/hotel-bill-detail.entity';
import { HotelBillsService } from './hotel-bill.service';
import { HotelBillsController } from './hotel-bill.controller';
import { HotelRoom } from '../room/entities/hotel-room.entity';
import { User } from '../../user/entities/user.entity';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { Voucher } from '../../voucher/entities/voucher.entity';
import { HotelRoomsModule } from '../room/hotel-room.module';
import { CooperationsModule } from '../../cooperation/cooperation.module';
import { VouchersModule } from '../../voucher/voucher.module';
import { WalletModule } from '../../wallet/wallet.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';

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
    WalletModule,
    BlockchainModule,
  ],
  controllers: [HotelBillsController],
  providers: [HotelBillsService],
  exports: [HotelBillsService],
})
export class HotelBillsModule {}
