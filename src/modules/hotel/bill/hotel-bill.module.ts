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
import { PaymentModule } from '../../payment/payment.module';

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
    WalletModule,
    BlockchainModule,
    PaymentModule,
    VouchersModule,
  ],
  controllers: [HotelBillsController],
  providers: [HotelBillsService],
  exports: [HotelBillsService],
})
export class HotelBillsModule {}
