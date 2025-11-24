import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalContractsController } from './rental-contract.controller';
import { RentalContractsService } from './rental-contract.service';
import { RentalContract } from './entities/rental-contract.entity';
import { User } from '../user/entities/user.entity';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([RentalContract, User]), CloudinaryModule],
  controllers: [RentalContractsController],
  providers: [RentalContractsService],
  exports: [RentalContractsService],
})
export class RentalContractsModule {}
