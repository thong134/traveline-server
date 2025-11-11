import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalContractsController } from './rental-contract.controller';
import { RentalContractsService } from './rental-contract.service';
import { RentalContract } from './entities/rental-contract.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RentalContract, User])],
  controllers: [RentalContractsController],
  providers: [RentalContractsService],
  exports: [RentalContractsService],
})
export class RentalContractsModule {}
