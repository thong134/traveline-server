import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DestinationBillService } from './destination-bill.service';
import { DestinationBillController } from './destination-bill.controller';
import { DestinationBill } from './entities/destination-bill.entity';
import { Destination } from '../destination/entities/destinations.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DestinationBill, Destination, User])],
  controllers: [DestinationBillController],
  providers: [DestinationBillService],
  exports: [DestinationBillService],
})
export class DestinationBillModule {}
