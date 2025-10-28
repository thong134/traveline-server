import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Flight } from './flight.entity';
import { FlightBill } from './flight-bill.entity';
import { FlightBillPassenger } from './flight-bill-passenger.entity';
import { FlightsService } from './flights.service';
import { FlightBillsService } from './flight-bills.service';
import { FlightsController } from './flights.controller';
import { FlightBillsController } from './flight-bills.controller';
import { Cooperation } from '../cooperations/cooperation.entity';
import { User } from '../users/entities/user.entity';
import { Voucher } from '../vouchers/voucher.entity';
import { VouchersModule } from '../vouchers/vouchers.module';
import { CooperationsModule } from '../cooperations/cooperations.module';

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
