import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DestinationsService } from './destination.service';
import { DestinationsController } from './destination.controller';
import { Destination } from './entities/destinations.entity';
import { User } from '../user/entities/user.entity';
import { DestinationEnrichmentService } from './destination-enrichment.service';
import { DestinationAutoDescriptionService } from './destination-auto-description.service';

import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Destination, User]),
    HttpModule,
    ConfigModule,
    CloudinaryModule,
  ],
  controllers: [DestinationsController],
  providers: [DestinationsService, DestinationEnrichmentService, DestinationAutoDescriptionService],
  exports: [DestinationsService, DestinationEnrichmentService, DestinationAutoDescriptionService],
})
export class DestinationsModule {}

