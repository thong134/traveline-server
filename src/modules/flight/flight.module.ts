import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Flight } from './flight/entities/flight.entity';
import { FlightBill } from './bill/entities/flight-bill.entity';
import { FlightBillPassenger } from './bill/entities/flight-bill-passenger.entity';
import { FlightsService } from './flight/flights.service';
import { FlightBillsService } from './bill/flight-bill.service';
import { FlightsController } from './flight/flights.controller';
import { FlightBillsController } from './bill/flight-bill.controller';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { User } from '../user/entities/user.entity';
import { Voucher } from '../voucher/entities/voucher.entity';
import { VouchersModule } from '../voucher/voucher.module';
import { CooperationsModule } from '../cooperation/cooperation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Flight,
      FlightBill,
      FlightBillPassenger,
      Cooperation,
      User,
      Voucher,
    ]),
    VouchersModule,
    CooperationsModule,
  ],
  controllers: [FlightsController, FlightBillsController],
  providers: [FlightsService, FlightBillsService],
  exports: [FlightsService, FlightBillsService],
})
export class FlightModule {}
