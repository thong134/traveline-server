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
import { User } from '../../../user/entities/user.entity';
import { Flight } from '../../flight/entities/flight.entity';
import { Voucher } from '../../../voucher/entities/voucher.entity';
import { FlightBillPassenger } from './flight-bill-passenger.entity';
import { Cooperation } from '../../../cooperation/entities/cooperation.entity';

export enum FlightBillStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('flight_bills')
export class FlightBill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @ManyToOne(() => User, (user) => user.flightBills, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Flight, (flight) => flight.bills, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'flight_id' })
  flight: Flight;

  @ManyToOne(() => Cooperation, (cooperation) => cooperation.flightBills, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

  @Column({ nullable: true })
  cabinClass?: string;

  @Column({ type: 'int', default: 0 })
  numberOfTickets: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  subtotal: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  total: string;

  @Column({ type: 'int', default: 0 })
  travelPointsUsed: number;

  @Column({ default: false })
  travelPointsRefunded: boolean;

  @ManyToOne(() => Voucher, (voucher) => voucher.flightBills, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'voucher_id' })
  voucher?: Voucher;

  @Column({
    type: 'enum',
    enum: FlightBillStatus,
    default: FlightBillStatus.PENDING,
  })
  status: FlightBillStatus;

  @Column({ type: 'text', nullable: true })
  statusReason?: string;

  @Column({ nullable: true })
  contactName?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @Column({ nullable: true })
  paymentMethod?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => FlightBillPassenger, (passenger) => passenger.bill, {
    cascade: true,
  })
  passengers: FlightBillPassenger[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
