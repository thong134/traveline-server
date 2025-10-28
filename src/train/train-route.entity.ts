import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Cooperation } from '../cooperations/cooperation.entity';
import { TrainBill } from './train-bill.entity';

@Entity('train_routes')
export class TrainRoute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Cooperation, (cooperation) => cooperation.trainRoutes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

  @Column({ name: 'cooperation_id' })
  cooperationId: number;

  @Column()
  departureStation: string;

  @Column()
  arrivalStation: string;

  @Column({ type: 'time with time zone' })
  departureTime: string;

  @Column({ type: 'time with time zone' })
  arrivalTime: string;

  @Column({ type: 'int', default: 0 })
  durationMinutes: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  basePrice: string;

  @Column({ type: 'int', default: 0 })
  seatCapacity: number;

  @Column({ nullable: true })
  seatClass?: string;

  @Column({ type: 'text', nullable: true })
  amenities?: string;

  @Column({ nullable: true })
  photo?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @OneToMany(() => TrainBill, (bill) => bill.route)
  bills: TrainBill[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
