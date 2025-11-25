import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { LegacyAdministrativeRegion } from './legacy-administrative-region.entity';
import { LegacyAdministrativeUnit } from './legacy-administrative-unit.entity';
import { LegacyDistrict } from './legacy-district.entity';

@Entity('provinces')
export class LegacyProvince {
  @PrimaryColumn({ length: 20 })
  code: string;

  @Column({ name: 'name', length: 255 })
  name: string;

  @Column({ name: 'name_en', type: 'varchar', length: 255, nullable: true })
  nameEn?: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: true })
  fullName?: string | null;

  @Column({
    name: 'full_name_en',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  fullNameEn?: string | null;

  @Column({ name: 'code_name', type: 'varchar', length: 255, nullable: true })
  codeName?: string | null;

  @Column({ name: 'administrative_unit_id', type: 'int', nullable: true })
  administrativeUnitId?: number | null;

  @Column({ name: 'administrative_region_id', type: 'int', nullable: true })
  administrativeRegionId?: number | null;

  @ManyToOne(() => LegacyAdministrativeUnit, (unit) => unit.provinces, {
    eager: false,
    nullable: true,
  })
  @JoinColumn({ name: 'administrative_unit_id' })
  administrativeUnit?: LegacyAdministrativeUnit | null;

  @ManyToOne(() => LegacyAdministrativeRegion, (region) => region.provinces, {
    eager: false,
    nullable: true,
  })
  @JoinColumn({ name: 'administrative_region_id' })
  region?: LegacyAdministrativeRegion | null;

  @OneToMany(
    () => LegacyDistrict,
    (district: LegacyDistrict) => district.province,
  )
  districts?: LegacyDistrict[];
}
