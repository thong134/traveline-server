import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { LegacyProvince } from './legacy-province.entity';

@Entity({ schema: 'vn_legacy', name: 'administrative_regions' })
export class LegacyAdministrativeRegion {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'name_en', length: 255 })
  nameEn: string;

  @Column({ name: 'code_name', type: 'varchar', length: 255, nullable: true })
  codeName?: string | null;

  @Column({
    name: 'code_name_en',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  codeNameEn?: string | null;

  @OneToMany(() => LegacyProvince, (province) => province.region)
  provinces?: LegacyProvince[];
}
