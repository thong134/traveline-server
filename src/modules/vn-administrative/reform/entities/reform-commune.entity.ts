import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ReformProvince } from './reform-province.entity';
import { ReformAdministrativeUnit } from './reform-administrative-unit.entity';

@Entity('ward_after_communes')
export class ReformCommune {
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

  @Column({
    name: 'province_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  provinceCode?: string | null;

  @ManyToOne(() => ReformProvince, { nullable: true })
  @JoinColumn({ name: 'province_code', referencedColumnName: 'code' })
  province?: ReformProvince | null;

  @ManyToOne(() => ReformAdministrativeUnit, { nullable: true })
  @JoinColumn({ name: 'administrative_unit_id' })
  administrativeUnit?: ReformAdministrativeUnit | null;
  @Column({ name: 'administrative_unit_id', type: 'int', nullable: true })
  administrativeUnitId?: number | null;
}
