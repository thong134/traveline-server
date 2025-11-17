import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegacyAdministrativeController } from './legacy/legacy.controller';
import { LegacyAdministrativeService } from './legacy/legacy.service';
import { LegacyProvince } from './legacy/entities/legacy-province.entity';
import { LegacyDistrict } from './legacy/entities/legacy-district.entity';
import { LegacyWard } from './legacy/entities/legacy-ward.entity';
import { LegacyAdministrativeRegion } from './legacy/entities/legacy-administrative-region.entity';
import { LegacyAdministrativeUnit } from './legacy/entities/legacy-administrative-unit.entity';
import { ReformAdministrativeController } from './reform/reform.controller';
import { ReformAdministrativeService } from './reform/reform.service';
import { ReformProvince } from './reform/entities/reform-province.entity';
import { ReformCommune } from './reform/entities/reform-commune.entity';
import { ReformAdministrativeRegion } from './reform/entities/reform-administrative-region.entity';
import { ReformAdministrativeUnit } from './reform/entities/reform-administrative-unit.entity';
import { AdministrativeMappingController } from './mapping/mapping.controller';
import { AdministrativeMappingService } from './mapping/mapping.service';
import { AdminUnitMapping } from './mapping/admin-reform-mapping.entity';
import { SeedAdminMappingCommand } from '../../commands/seed-admin-mapping.command';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LegacyProvince,
      LegacyDistrict,
      LegacyWard,
      LegacyAdministrativeRegion,
      LegacyAdministrativeUnit,
      ReformProvince,
      ReformCommune,
      ReformAdministrativeRegion,
      ReformAdministrativeUnit,
      AdminUnitMapping,
    ]),
  ],
  controllers: [
    LegacyAdministrativeController,
    ReformAdministrativeController,
    AdministrativeMappingController,
  ],
  providers: [
    LegacyAdministrativeService,
    ReformAdministrativeService,
    AdministrativeMappingService,
    SeedAdminMappingCommand,
  ],
  exports: [
    LegacyAdministrativeService,
    ReformAdministrativeService,
    AdministrativeMappingService,
    SeedAdminMappingCommand,
  ],
})
export class VnAdministrativeModule {}
