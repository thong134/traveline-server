import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FlightBill } from './flight-bill.entity';

@Entity('flight_bill_passengers')
export class FlightBillPassenger {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FlightBill, (bill) => bill.passengers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bill_id' })
  bill: FlightBill;

  @Column()
  passengerName: string;

  @Column({ nullable: true })
  passengerPhone?: string;

  @Column({ nullable: true })
  passportNumber?: string;

  @Column({ nullable: true })
  seatNumber?: string;

  @Column({ nullable: true })
  cabinClass?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  total: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
