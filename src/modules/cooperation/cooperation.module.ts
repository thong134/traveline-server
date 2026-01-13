import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cooperation } from './entities/cooperation.entity';
import { CooperationContract } from './entities/cooperation-contract.entity';
import { CooperationServiceConfig } from './entities/cooperation-service-config.entity';
import { CooperationsService } from './cooperation.service';
import { CooperationsController } from './cooperation.controller';
import { PartnerCatalogService } from './partner-catalog.service';
import { CooperationPaymentService } from './cooperation-payment.service';
import { BookingTransaction } from '../payment/entities/booking-transaction.entity';
import { User } from '../user/entities/user.entity';
import { UsersModule } from '../user/user.module';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cooperation,
      CooperationContract,
      CooperationServiceConfig,
      User,
      BookingTransaction,
    ]),
    UsersModule,
    CloudinaryModule,
  ],
  controllers: [CooperationsController],
  providers: [
    CooperationsService,
    PartnerCatalogService,
    CooperationPaymentService,
  ],
  exports: [
    CooperationsService,
    PartnerCatalogService,
    CooperationPaymentService,
  ],
})
export class CooperationsModule {}
