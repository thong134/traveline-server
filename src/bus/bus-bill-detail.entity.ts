import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BusBill } from './bus-bill.entity';

@Entity('bus_bill_details')
export class BusBillDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BusBill, (bill) => bill.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bill_id' })
  bill: BusBill;

  @Column({ name: 'bill_id' })
  billId: number;

  @Column({ type: 'int' })
  seatNumber: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  total: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
