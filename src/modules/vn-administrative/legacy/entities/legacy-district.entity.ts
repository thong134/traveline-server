import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { LegacyProvince } from './legacy-province.entity';
import { LegacyAdministrativeUnit } from './legacy-administrative-unit.entity';
import { LegacyWard } from './legacy-ward.entity';

@Entity({ schema: 'vn_legacy', name: 'districts' })
export class LegacyDistrict {
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

  @Column({ name: 'province_code', type: 'varchar', length: 20, nullable: true })
  provinceCode?: string | null;

  @Column({ name: 'administrative_unit_id', type: 'int', nullable: true })
  administrativeUnitId?: number | null;

  @ManyToOne(() => LegacyProvince, (province) => province.districts, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'province_code', referencedColumnName: 'code' })
  province?: LegacyProvince | null;

  @ManyToOne(() => LegacyAdministrativeUnit, (unit) => unit.districts, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'administrative_unit_id' })
  administrativeUnit?: LegacyAdministrativeUnit | null;

  @OneToMany(() => LegacyWard, (ward: LegacyWard) => ward.district)
  wards?: LegacyWard[];
}
