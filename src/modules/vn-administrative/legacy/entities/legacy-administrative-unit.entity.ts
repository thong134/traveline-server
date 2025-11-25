import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { LegacyProvince } from './legacy-province.entity';
import { LegacyDistrict } from './legacy-district.entity';
import { LegacyWard } from './legacy-ward.entity';

@Entity('administrative_units_old')
export class LegacyAdministrativeUnit {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: true })
  fullName?: string | null;

  @Column({
    name: 'full_name_en',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  fullNameEn?: string | null;

  @Column({ name: 'short_name', type: 'varchar', length: 255, nullable: true })
  shortName?: string | null;

  @Column({
    name: 'short_name_en',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  shortNameEn?: string | null;

  @Column({ name: 'code_name', type: 'varchar', length: 255, nullable: true })
  codeName?: string | null;

  @Column({
    name: 'code_name_en',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  codeNameEn?: string | null;

  @OneToMany(() => LegacyProvince, (province) => province.administrativeUnit)
  provinces?: LegacyProvince[];

  @OneToMany(() => LegacyDistrict, (district) => district.administrativeUnit)
  districts?: LegacyDistrict[];

  @OneToMany(() => LegacyWard, (ward) => ward.administrativeUnit)
  wards?: LegacyWard[];
}
