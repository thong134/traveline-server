import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryVehicle } from './delivery-vehicle/entities/delivery-vehicle.entity';
import { DeliveryBill } from './bill/entities/delivery-bill.entity';
import { DeliveryVehiclesService } from './delivery-vehicle/delivery-vehicles.service';
import { DeliveryBillsService } from './bill/delivery-bill.service';
import { DeliveryVehiclesController } from './delivery-vehicle/delivery-vehicles.controller';
import { DeliveryBillsController } from './bill/delivery-bill.controller';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { User } from '../user/entities/user.entity';
import { Voucher } from '../voucher/entities/voucher.entity';
import { VouchersModule } from '../voucher/voucher.module';
import { CooperationsModule } from '../cooperation/cooperation.module';

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
