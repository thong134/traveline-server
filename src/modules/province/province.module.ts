import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvincesService } from './province.service';
import { ProvincesController } from './province.controller';
import { Province } from './entities/province.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Province])],
  controllers: [ProvincesController],
  providers: [ProvincesService],
  exports: [ProvincesService],
})
export class ProvincesModule {}
