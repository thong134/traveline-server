import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalContractsController } from './rental-contracts.controller';
import { RentalContractsService } from './rental-contracts.service';
import { RentalContract } from './rental-contract.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RentalContract, User])],
  controllers: [RentalContractsController],
  providers: [RentalContractsService],
  exports: [RentalContractsService],
})
export class RentalContractsModule {}
