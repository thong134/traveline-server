import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { RentalBill } from '../rental-bill/entities/rental-bill.entity';
import { User } from '../user/entities/user.entity';
import { Payout } from './entities/payout.entity';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, RentalBill, User, Payout])],
  providers: [PaymentService, RolesGuard],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
