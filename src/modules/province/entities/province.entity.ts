import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('provinces')
export class Province {
  @PrimaryColumn({ length: 20 })
  code: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ name: 'name_en', length: 255, nullable: true })
  nameEn?: string;

  @Column({ name: 'full_name', length: 255, nullable: true })
  fullName: string;

  @Column({ name: 'full_name_en', length: 255, nullable: true })
  fullNameEn?: string;

  @Column({ name: 'code_name', length: 255, nullable: true })
  codeName?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'administrative_unit_id', type: 'integer', nullable: true })
  administrativeUnitId?: number;

  @Column({ name: 'administrative_region_id', type: 'integer', nullable: true })
  administrativeRegionId?: number;
}
