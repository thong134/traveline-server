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
import { BusBill } from './bus-bill.entity';

@Entity('bus_types')
export class BusType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Cooperation, (cooperation) => cooperation.busTypes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

  @Column({ name: 'cooperation_id' })
  cooperationId: number;

  @Column({ type: 'int', default: 0 })
  numberOfSeats: number;

  @Column({ type: 'int', default: 0 })
  numberOfBuses: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: string;

  @Column({ type: 'text', nullable: true })
  route?: string;

  @Column({ nullable: true })
  photo?: string;

  @OneToMany(() => BusBill, (bill) => bill.busType)
  bills: BusBill[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
