import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalBillsService } from './rental-bills.service';
import { RentalBillsController } from './rental-bills.controller';
import { RentalBill } from './rental-bill.entity';
import { RentalBillDetail } from './rental-bill-detail.entity';
import { RentalVehicle } from '../rental-vehicles/rental-vehicle.entity';
import { RentalContract } from '../rental-contracts/rental-contract.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RentalBill,
      RentalBillDetail,
      RentalVehicle,
      RentalContract,
      User,
    ]),
  ],
  providers: [RentalBillsService],
  controllers: [RentalBillsController],
  exports: [RentalBillsService],
})
export class RentalBillsModule {}
