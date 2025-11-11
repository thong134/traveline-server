import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from './entities/voucher.entity';
import { VouchersService } from './voucher.service';
import { VouchersController } from './voucher.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Voucher])],
  controllers: [VouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
