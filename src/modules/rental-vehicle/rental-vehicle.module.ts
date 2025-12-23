import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalVehiclesService } from './rental-vehicle.service';
import { RentalVehiclesController } from './rental-vehicle.controller';
import { RentalVehicle } from './entities/rental-vehicle.entity';
import { RentalVehicleMaintenance } from './entities/rental-vehicle-maintenance.entity';
import { RentalContract } from '../rental-contract/entities/rental-contract.entity';
import { VehicleCatalog } from '../vehicle-catalog/entities/vehicle-catalog.entity';
import { User } from '../user/entities/user.entity';
import { RentalBill } from '../rental-bill/entities/rental-bill.entity';
import { RentalBillDetail } from '../rental-bill/entities/rental-bill-detail.entity';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RentalVehicle,
      RentalVehicleMaintenance,
      RentalContract,
      VehicleCatalog,
      User,
      RentalBill,
      RentalBillDetail,
    ]),
    CloudinaryModule,
  ],
  providers: [RentalVehiclesService],
  controllers: [RentalVehiclesController],
  exports: [RentalVehiclesService],
})
export class RentalVehiclesModule {}
