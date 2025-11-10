import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalVehiclesService } from './rental-vehicles.service';
import { RentalVehiclesController } from './rental-vehicles.controller';
import { RentalVehicle } from './rental-vehicle.entity';
import { RentalContract } from '../rental-contracts/rental-contract.entity';
import { VehicleCatalog } from '../vehicle-catalog/vehicle-catalog.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RentalVehicle,
      RentalContract,
      VehicleCatalog,
      User,
    ]),
  ],
  providers: [RentalVehiclesService],
  controllers: [RentalVehiclesController],
  exports: [RentalVehiclesService],
})
export class RentalVehiclesModule {}
