import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { LegacyDistrict } from './legacy-district.entity';
import { LegacyAdministrativeUnit } from './legacy-administrative-unit.entity';

@Entity({ schema: 'vn_legacy', name: 'wards' })
export class LegacyWard {
  @PrimaryColumn({ length: 20 })
  code: string;

  @Column({ name: 'name', length: 255 })
  name: string;

  @Column({ name: 'name_en', length: 255, nullable: true })
  nameEn?: string | null;

  @Column({ name: 'full_name', length: 255, nullable: true })
  fullName?: string | null;

  @Column({ name: 'full_name_en', length: 255, nullable: true })
  fullNameEn?: string | null;

  @Column({ name: 'code_name', length: 255, nullable: true })
  codeName?: string | null;

  @Column({ name: 'district_code', length: 20, nullable: true })
  districtCode?: string | null;

  @Column({ name: 'administrative_unit_id', type: 'int', nullable: true })
  administrativeUnitId?: number | null;

  @ManyToOne(() => LegacyDistrict, (district) => district.wards, {
    nullable: true,
  })
  @JoinColumn({ name: 'district_code', referencedColumnName: 'code' })
  district?: LegacyDistrict | null;

  @ManyToOne(() => LegacyAdministrativeUnit, (unit) => unit.wards, {
    nullable: true,
  })
  @JoinColumn({ name: 'administrative_unit_id' })
  administrativeUnit?: LegacyAdministrativeUnit | null;
}
