import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'vn_reform', name: 'administrative_units' })
export class ReformAdministrativeUnit {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ name: 'full_name', length: 255, nullable: true })
  fullName?: string | null;

  @Column({ name: 'full_name_en', length: 255, nullable: true })
  fullNameEn?: string | null;

  @Column({ name: 'short_name', length: 255, nullable: true })
  shortName?: string | null;

  @Column({ name: 'short_name_en', length: 255, nullable: true })
  shortNameEn?: string | null;

  @Column({ name: 'code_name', length: 255, nullable: true })
  codeName?: string | null;

  @Column({ name: 'code_name_en', length: 255, nullable: true })
  codeNameEn?: string | null;
}
