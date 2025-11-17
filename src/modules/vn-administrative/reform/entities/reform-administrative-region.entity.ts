import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'vn_reform', name: 'administrative_regions' })
export class ReformAdministrativeRegion {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'name_en', length: 255 })
  nameEn: string;

  @Column({ name: 'code_name', length: 255, nullable: true })
  codeName?: string | null;

  @Column({ name: 'code_name_en', length: 255, nullable: true })
  codeNameEn?: string | null;
}
