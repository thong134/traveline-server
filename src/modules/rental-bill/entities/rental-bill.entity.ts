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
import { User } from '../../user/entities/user.entity';
import { RentalBillDetail } from './rental-bill-detail.entity';
import { Voucher } from '../../voucher/entities/voucher.entity';

export enum RentalBillType {
  HOURLY = 'hourly',
  DAILY = 'daily',
}

export enum RentalBillStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('rental_bills')
export class RentalBill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @ManyToOne(() => User, (user: User) => user.rentalBills, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'enum', enum: RentalBillType, default: RentalBillType.DAILY })
  rentalType: RentalBillType;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz' })
  endDate: Date;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  paymentMethod?: string;

  @Column({ nullable: true })
  contactName?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: string;

  @ManyToOne(() => Voucher, (voucher: Voucher) => voucher.rentalBills, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'voucherId' })
  voucher?: Voucher;

  @Column({ nullable: true })
  voucherId?: number;

  @Column({ type: 'int', default: 0 })
  travelPointsUsed: number;

  @Column({
    type: 'enum',
    enum: RentalBillStatus,
    default: RentalBillStatus.PENDING,
  })
  status: RentalBillStatus;

  @Column({ nullable: true })
  verifiedSelfiePhoto?: string;

  @Column({ nullable: true })
  notes?: string;

  @OneToMany(
    () => RentalBillDetail,
    (detail: RentalBillDetail) => detail.bill,
    { cascade: true },
  )
  details: RentalBillDetail[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
