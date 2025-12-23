import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TrainBill } from './train-bill.entity';

@Entity('train_bill_details')
export class TrainBillDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TrainBill, (bill) => bill.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bill_id' })
  bill: TrainBill;

  @Column()
  passengerName: string;

  @Column({ nullable: true })
  passengerPhone?: string;

  @Column({ nullable: true })
  seatNumber?: string;

  @Column({ nullable: true })
  seatClass?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  total: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
