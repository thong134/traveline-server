import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cooperation } from './entities/cooperation.entity';
import { CooperationsService } from './cooperation.service';
import { CooperationsController } from './cooperation.controller';
import { PartnerCatalogService } from './partner-catalog.service';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cooperation, User])],
  controllers: [CooperationsController],
  providers: [CooperationsService, PartnerCatalogService],
  exports: [CooperationsService, PartnerCatalogService],
})
export class CooperationsModule {}
