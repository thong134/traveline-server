import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainRoute } from './train-route.entity';
import { TrainBill } from './train-bill.entity';
import { TrainBillDetail } from './train-bill-detail.entity';
import { TrainRoutesService } from './train-routes.service';
import { TrainBillsService } from './train-bills.service';
import { TrainRoutesController } from './train-routes.controller';
import { TrainBillsController } from './train-bills.controller';
import { Cooperation } from '../cooperations/cooperation.entity';
import { User } from '../users/entities/user.entity';
import { Voucher } from '../vouchers/voucher.entity';
import { VouchersModule } from '../vouchers/vouchers.module';
import { CooperationsModule } from '../cooperations/cooperations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrainRoute,
      TrainBill,
      TrainBillDetail,
      Cooperation,
      User,
      Voucher,
    ]),
    VouchersModule,
    CooperationsModule,
  ],
  controllers: [TrainRoutesController, TrainBillsController],
  providers: [TrainRoutesService, TrainBillsService],
  exports: [TrainRoutesService, TrainBillsService],
})
export class TrainModule {}
