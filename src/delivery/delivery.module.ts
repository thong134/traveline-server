import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryVehicle } from './delivery-vehicle.entity';
import { DeliveryBill } from './delivery-bill.entity';
import { DeliveryVehiclesService } from './delivery-vehicles.service';
import { DeliveryBillsService } from './delivery-bills.service';
import { DeliveryVehiclesController } from './delivery-vehicles.controller';
import { DeliveryBillsController } from './delivery-bills.controller';
import { Cooperation } from '../cooperations/cooperation.entity';
import { User } from '../users/entities/user.entity';
import { Voucher } from '../vouchers/voucher.entity';
import { VouchersModule } from '../vouchers/vouchers.module';
import { CooperationsModule } from '../cooperations/cooperations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryVehicle,
      DeliveryBill,
      Cooperation,
      User,
      Voucher,
    ]),
    VouchersModule,
    CooperationsModule,
  ],
  controllers: [DeliveryVehiclesController, DeliveryBillsController],
  providers: [DeliveryVehiclesService, DeliveryBillsService],
  exports: [DeliveryVehiclesService, DeliveryBillsService],
})
export class DeliveryModule {}
