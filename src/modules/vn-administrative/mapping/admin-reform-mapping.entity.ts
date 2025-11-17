import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vn_admin_unit_mappings')
export class AdminUnitMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'old_province_code', length: 20 })
  oldProvinceCode: string;

  @Column({ name: 'old_district_code', length: 20, nullable: true })
  oldDistrictCode?: string | null;

  @Column({ name: 'old_ward_code', length: 20, nullable: true })
  oldWardCode?: string | null;

  @Column({ name: 'new_province_code', length: 20 })
  newProvinceCode: string;

  @Column({ name: 'new_commune_code', length: 20, nullable: true })
  newCommuneCode?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ name: 'resolution_ref', length: 255, nullable: true })
  resolutionRef?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
