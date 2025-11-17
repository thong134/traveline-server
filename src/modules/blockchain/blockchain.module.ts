import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainService } from './blockchain.service';
import { RentalTransaction } from './entities/rental-transaction.entity';
import { BlockchainController } from './blockchain.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RentalTransaction])],
  controllers: [BlockchainController],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
