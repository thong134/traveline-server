import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleInformation } from './vehicle-information.entity';
import { VehicleInformationService } from './vehicle-information.service';
import { VehicleInformationController } from './vehicle-information.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleInformation])],
  providers: [VehicleInformationService],
  controllers: [VehicleInformationController],
  exports: [VehicleInformationService],
})
export class VehicleInformationModule {}
