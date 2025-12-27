import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DestinationsService } from './destination.service';
import { DestinationsController } from './destination.controller';
import { Destination } from './entities/destinations.entity';
import { User } from '../user/entities/user.entity';

import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Destination, User]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [DestinationsController],
  providers: [DestinationsService],
  exports: [DestinationsService],
})
export class DestinationsModule {}
