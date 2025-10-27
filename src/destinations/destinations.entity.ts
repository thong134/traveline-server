import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Destination {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  type?: string;

  @Column({ type: 'text', nullable: true })
  descriptionViet?: string;

  @Column({ type: 'text', nullable: true })
  descriptionEng?: string;

  @Column({ nullable: true })
  province?: string;

  @Column({ nullable: true })
  specificAddress?: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'double precision', nullable: true })
  rating?: number;

  @Column({ type: 'int', default: 0 })
  favouriteTimes = 0;

  @Column({ type: 'int', default: 0 })
  userRatingsTotal = 0;

  @Column('text', { array: true, default: '{}' })
  categories: string[] = [];

  @Column('text', { array: true, default: '{}' })
  photos: string[] = [];

  @Column({ nullable: true })
  videoUrl?: string;

  @Column({ nullable: true })
  googlePlaceId?: string;

  @Column({ type: 'timestamp', nullable: true })
  sourceCreatedAt?: Date;

  @Column({ default: true })
  available: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}