import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvincesService } from './province.service';
import { ProvincesController } from './province.controller';
import { Province } from './entities/province.entity';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Province]), CloudinaryModule],
  controllers: [ProvincesController],
  providers: [ProvincesService],
  exports: [ProvincesService],
})
export class ProvincesModule {}
