import { Module } from '@nestjs/common';
import { DestinationsModule } from '../destination/destination.module';
import { RentalContractsModule } from '../rental-contract/rental-contract.module';
import { RentalVehiclesModule } from '../rental-vehicle/rental-vehicle.module';
import { CooperationsModule } from '../cooperation/cooperation.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    DestinationsModule,
    RentalContractsModule,
    RentalVehiclesModule,
    CooperationsModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
