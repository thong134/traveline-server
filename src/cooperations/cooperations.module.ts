import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cooperation } from './cooperation.entity';
import { CooperationsService } from './cooperations.service';
import { CooperationsController } from './cooperations.controller';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cooperation, User])],
  controllers: [CooperationsController],
  providers: [CooperationsService],
  exports: [CooperationsService],
})
export class CooperationsModule {}
