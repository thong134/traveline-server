import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainRoute } from './train/entities/train-route.entity';
import { TrainBill } from './bill/entities/train-bill.entity';
import { TrainBillDetail } from './bill/entities/train-bill-detail.entity';
import { TrainRoutesService } from './train/train.service';
import { TrainBillsService } from './bill/train-bill.service';
import { TrainRoutesController } from './train/train.controller';
import { TrainBillsController } from './bill/train-bill.controller';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { User } from '../user/entities/user.entity';
import { Voucher } from '../voucher/entities/voucher.entity';
import { VouchersModule } from '../voucher/voucher.module';
import { CooperationsModule } from '../cooperation/cooperation.module';

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
