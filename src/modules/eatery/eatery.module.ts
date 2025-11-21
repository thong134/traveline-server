import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EateriesController } from './eatery.controller';
import { EateriesService } from './eatery.service';
import { Eatery } from './entities/eatery.entity';
import { User } from '../user/entities/user.entity';
import { UsersModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Eatery, User]), UsersModule],
  controllers: [EateriesController],
  providers: [EateriesService],
  exports: [EateriesService],
})
export class EateriesModule {}
