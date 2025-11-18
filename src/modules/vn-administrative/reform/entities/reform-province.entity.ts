import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ReformAdministrativeUnit } from './reform-administrative-unit.entity';

@Entity({ schema: 'vn_reform', name: 'province_after_communes' })
export class ReformProvince {
  @PrimaryColumn({ length: 20 })
  code: string;

  @Column({ name: 'name', length: 255 })
  name: string;

  @Column({ name: 'name_en', type: 'varchar', length: 255, nullable: true })
  nameEn?: string | null;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

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

  @ManyToOne(() => ReformAdministrativeUnit, { nullable: true })
  @JoinColumn({ name: 'administrative_unit_id' })
  administrativeUnit?: ReformAdministrativeUnit | null;
}
