import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdministrativeMappingController } from './mapping/mapping.controller';
import { AdministrativeMappingService } from './mapping/mapping.service';
import { AdminUnitMapping } from './mapping/admin-reform-mapping.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUnitMapping]),
  ],
  controllers: [AdministrativeMappingController],
  providers: [AdministrativeMappingService],
  exports: [AdministrativeMappingService],
})
export class VnAdministrativeModule {}
