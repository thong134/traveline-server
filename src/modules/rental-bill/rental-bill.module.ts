import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalBillsService } from './rental-bill.service';
import { RentalBillsController } from './rental-bill.controller';
import { RentalBill } from './entities/rental-bill.entity';
import { RentalBillDetail } from './entities/rental-bill-detail.entity';
import { RentalVehicle } from '../rental-vehicle/entities/rental-vehicle.entity';
import { User } from '../user/entities/user.entity';
import { Voucher } from '../voucher/entities/voucher.entity';
import { VouchersModule } from '../voucher/voucher.module';
import { WalletModule } from '../wallet/wallet.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { PaymentModule } from '../payment/payment.module';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { FptAiModule } from '../../common/fpt-ai/fpt-ai.module';
import { RentalVehiclesModule } from '../rental-vehicle/rental-vehicle.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RentalBill,
      RentalBillDetail,
      RentalVehicle,
      User,
      Voucher,
    ]),
    VouchersModule,
    WalletModule,
    BlockchainModule,
    BlockchainModule,
    PaymentModule,
    CloudinaryModule,
    FptAiModule,
    RentalVehiclesModule,
  ],
  providers: [RentalBillsService],
  controllers: [RentalBillsController],
  exports: [RentalBillsService],
})
export class RentalBillsModule {}
