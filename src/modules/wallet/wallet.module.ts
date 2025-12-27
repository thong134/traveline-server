import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { UserWallet } from './entities/user-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { User } from '../user/entities/user.entity';

import { HttpModule } from '@nestjs/axios';
import { MomoService } from './momo/momo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserWallet, WalletTransaction, User]),
    HttpModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, MomoService],
  exports: [WalletService],
})
export class WalletModule {}
