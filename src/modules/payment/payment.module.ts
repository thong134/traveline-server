import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { RentalBill } from '../rental-bill/entities/rental-bill.entity';
import { User } from '../user/entities/user.entity';
import { Payout } from './entities/payout.entity';
import { BookingTransaction } from './entities/booking-transaction.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WalletModule } from '../wallet/wallet.module';
import { VouchersModule } from '../voucher/voucher.module';
import { HotelBill } from '../hotel/bill/entities/hotel-bill.entity';
import { BusBill } from '../bus/bill/entities/bus-bill.entity';
import { TrainBill } from '../train/bill/entities/train-bill.entity';
import { FlightBill } from '../flight/bill/entities/flight-bill.entity';
import { DeliveryBill } from '../delivery/bill/entities/delivery-bill.entity';
import { CooperationPaymentService } from '../cooperation/cooperation-payment.service';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { CooperationsModule } from '../cooperation/cooperation.module';
import { HotelRoomsModule } from '../hotel/room/hotel-room.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      RentalBill,
      User,
      Payout,
      BookingTransaction,
      HotelBill,
      BusBill,
      TrainBill,
      FlightBill,
      DeliveryBill,
      Cooperation,
    ]),
    WalletModule,
    VouchersModule,
    CooperationsModule,
    HotelRoomsModule,
  ],
  providers: [PaymentService, RolesGuard],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
