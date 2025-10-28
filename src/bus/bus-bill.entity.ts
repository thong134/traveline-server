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
import { BusType } from './bus-type.entity';
import { Voucher } from '../vouchers/voucher.entity';
import { BusBillDetail } from './bus-bill-detail.entity';
import { Cooperation } from '../cooperations/cooperation.entity';

export enum BusBillStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  BOARDING = 'BOARDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('bus_bills')
export class BusBill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @ManyToOne(() => User, (user) => user.busBills, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => BusType, (busType) => busType.bills, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'bus_type_id' })
  busType: BusType;

  @Column({ name: 'bus_type_id' })
  busTypeId: number;

  @ManyToOne(() => Cooperation, (cooperation) => cooperation.busBills, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

  @Column({ name: 'cooperation_id' })
  cooperationId: number;

  @Column()
  pickUpLocation: string;

  @Column({ nullable: true })
  pickUpTime?: string;

  @Column({ nullable: true })
  returnPickUpLocation?: string;

  @Column({ nullable: true })
  returnPickUpTime?: string;

  @Column()
  startDate: string;

  @Column()
  endDate: string;

  @Column({ nullable: true })
  returnStartDate?: string;

  @Column({ nullable: true })
  returnEndDate?: string;

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

  @ManyToOne(() => Voucher, (voucher) => voucher.busBills, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'voucher_id' })
  voucher?: Voucher;

  @Column({ name: 'voucher_id', nullable: true })
  voucherId?: number;

  @Column({ type: 'enum', enum: BusBillStatus, default: BusBillStatus.PENDING })
  status: BusBillStatus;

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

  @OneToMany(() => BusBillDetail, (detail) => detail.bill, {
    cascade: true,
  })
  details: BusBillDetail[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
