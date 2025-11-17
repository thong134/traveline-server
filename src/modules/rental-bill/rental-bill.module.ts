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
  ],
  providers: [RentalBillsService],
  controllers: [RentalBillsController],
  exports: [RentalBillsService],
})
export class RentalBillsModule {}
