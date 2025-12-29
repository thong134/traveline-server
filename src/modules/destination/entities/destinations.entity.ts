import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RouteStop } from '../../travel-route/entities/route-stop.entity';
import { Feedback } from '../../feedback/entities/feedback.entity';

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
  district?: string;

  @Column({ nullable: true })
  districtCode?: string;

  @Column({ nullable: true })
  specificAddress?: string;

  @Column({ nullable: true })
  reformAddress?: string;

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

  @Column('text', { array: true, default: '{}' })
  videos: string[] = [];

  @Column({ nullable: true })
  googlePlaceId?: string;

  @Column({ nullable: true })
  openTime?: string;

  @Column({ nullable: true })
  closeTime?: string;

  @Column({ type: 'timestamptz', nullable: true })
  sourceCreatedAt?: Date;

  @Column({ default: true })
  available: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => RouteStop, (stop: RouteStop) => stop.destination)
  routeStops: RouteStop[];

  @OneToMany(() => Feedback, (feedback: Feedback) => feedback.destination)
  feedbacks: Feedback[];
}
