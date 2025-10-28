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
import { User } from '../users/entities/user.entity';
import { TrainRoute } from './train-route.entity';
import { Voucher } from '../vouchers/voucher.entity';
import { TrainBillDetail } from './train-bill-detail.entity';
import { Cooperation } from '../cooperations/cooperation.entity';

export enum TrainBillStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('train_bills')
export class TrainBill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @ManyToOne(() => User, (user) => user.trainBills, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => TrainRoute, (route) => route.bills, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'route_id' })
  route: TrainRoute;

  @Column({ name: 'route_id' })
  routeId: number;

  @ManyToOne(() => Cooperation, (cooperation) => cooperation.trainBills, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

  @Column({ name: 'cooperation_id' })
  cooperationId: number;

  @Column({ type: 'date' })
  travelDate: Date;

  @Column({ nullable: true })
  carriage?: string;

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

  @ManyToOne(() => Voucher, (voucher) => voucher.trainBills, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'voucher_id' })
  voucher?: Voucher;

  @Column({ name: 'voucher_id', nullable: true })
  voucherId?: number;

  @Column({
    type: 'enum',
    enum: TrainBillStatus,
    default: TrainBillStatus.PENDING,
  })
  status: TrainBillStatus;

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

  @OneToMany(() => TrainBillDetail, (detail) => detail.bill, { cascade: true })
  details: TrainBillDetail[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
