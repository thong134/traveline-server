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
import { Cooperation } from '../../../cooperation/entities/cooperation.entity';
import { HotelBillDetail } from './hotel-bill-detail.entity';
import { Voucher } from '../../../voucher/entities/voucher.entity';

export enum HotelBillStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('hotel_bills')
export class HotelBill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @ManyToOne(() => User, (user: User) => user.hotelBills, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(
    () => Cooperation,
    (cooperation: Cooperation) => cooperation.hotelBills,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

  @Column({ name: 'cooperation_id' })
  cooperationId: number;

  @ManyToOne(() => Voucher, (voucher: Voucher) => voucher.hotelBills, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'voucher_id' })
  voucher?: Voucher;

  @Column({ name: 'voucher_id', nullable: true })
  voucherId?: number;

  @Column({ type: 'timestamptz' })
  checkInDate: Date;

  @Column({ type: 'timestamptz' })
  checkOutDate: Date;

  @Column({ type: 'int', default: 1 })
  numberOfRooms: number;

  @Column({ type: 'int', default: 1 })
  nights: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total: string;

  @Column({ type: 'int', default: 0 })
  travelPointsUsed: number;

  @Column({ default: false })
  travelPointsRefunded: boolean;

  @Column({
    type: 'enum',
    enum: HotelBillStatus,
    default: HotelBillStatus.PENDING,
  })
  status: HotelBillStatus;

  @Column({ nullable: true })
  statusReason?: string;

  @Column({ nullable: true })
  paymentMethod?: string;

  @Column({ nullable: true })
  contactName?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => HotelBillDetail, (detail: HotelBillDetail) => detail.bill, {
    cascade: true,
  })
  details: HotelBillDetail[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
