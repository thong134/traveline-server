import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusType } from './bus-type.entity';
import { BusBill } from './bus-bill.entity';
import { BusBillDetail } from './bus-bill-detail.entity';
import { BusTypesService } from './bus-types.service';
import { BusBillsService } from './bus-bills.service';
import { BusTypesController } from './bus-types.controller';
import { BusBillsController } from './bus-bills.controller';
import { Cooperation } from '../cooperations/cooperation.entity';
import { User } from '../users/entities/user.entity';
import { Voucher } from '../vouchers/voucher.entity';
import { VouchersModule } from '../vouchers/vouchers.module';
import { CooperationsModule } from '../cooperations/cooperations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BusType,
      BusBill,
      BusBillDetail,
      Cooperation,
      User,
      Voucher,
    ]),
    VouchersModule,
    CooperationsModule,
  ],
  controllers: [BusTypesController, BusBillsController],
  providers: [BusTypesService, BusBillsService],
  exports: [BusTypesService, BusBillsService],
})
export class BusModule {}
