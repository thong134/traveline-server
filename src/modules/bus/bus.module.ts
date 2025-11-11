import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusType } from './bus/entities/bus-type.entity';
import { BusBill } from './bill/entities/bus-bill.entity';
import { BusBillDetail } from './bill/entities/bus-bill-detail.entity';
import { BusTypesService } from './bus/bus-types.service';
import { BusBillsService } from './bill/bus-bills.service';
import { BusTypesController } from './bus/bus-types.controller';
import { BusBillsController } from './bill/bus-bills.controller';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { User } from '../user/entities/user.entity';
import { Voucher } from '../voucher/entities/voucher.entity';
import { VouchersModule } from '../voucher/voucher.module';
import { CooperationsModule } from '../cooperation/cooperation.module';

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
