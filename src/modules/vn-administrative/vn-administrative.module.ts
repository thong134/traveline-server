import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdministrativeMappingController } from './mapping/mapping.controller';
import { AdministrativeMappingService } from './mapping/mapping.service';
import { AdminUnitMapping } from './mapping/admin-reform-mapping.entity';
import { LegacyWard } from './legacy/entities/legacy-ward.entity';
import { LegacyDistrict } from './legacy/entities/legacy-district.entity';
import { LegacyProvince } from './legacy/entities/legacy-province.entity';
import { LegacyAdministrativeUnit } from './legacy/entities/legacy-administrative-unit.entity';
import { LegacyAdministrativeRegion } from './legacy/entities/legacy-administrative-region.entity';
import { ReformCommune } from './reform/entities/reform-commune.entity';
import { ReformProvince } from './reform/entities/reform-province.entity';
import { ReformAdministrativeUnit } from './reform/entities/reform-administrative-unit.entity';
import { ReformAdministrativeRegion } from './reform/entities/reform-administrative-region.entity';
import { LegacyAdministrativeController } from './legacy/legacy.controller';
import { LegacyAdministrativeService } from './legacy/legacy.service';
import { ReformAdministrativeController } from './reform/reform.controller';
import { ReformAdministrativeService } from './reform/reform.service';
import { Destination } from '../destination/entities/destinations.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUnitMapping,
      LegacyWard,
      LegacyDistrict,
      LegacyProvince,
      LegacyAdministrativeUnit,
      LegacyAdministrativeRegion,
      ReformCommune,
      ReformProvince,
      ReformAdministrativeUnit,
      ReformAdministrativeRegion,
      Destination,
    ]),
  ],
  controllers: [
    AdministrativeMappingController,
    LegacyAdministrativeController,
    ReformAdministrativeController,
  ],
  providers: [
    AdministrativeMappingService,
    LegacyAdministrativeService,
    ReformAdministrativeService,
  ],
  exports: [AdministrativeMappingService],
})
export class VnAdministrativeModule {}
