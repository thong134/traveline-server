import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';
import { DeliveryVehicle } from './delivery-vehicle.entity';
import { Voucher } from '../vouchers/voucher.entity';
import { Cooperation } from '../cooperations/cooperation.entity';

export enum DeliveryBillStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('delivery_bills')
export class DeliveryBill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @ManyToOne(() => User, (user) => user.deliveryBills, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => DeliveryVehicle, (vehicle) => vehicle.bills, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: DeliveryVehicle;

  @Column({ name: 'vehicle_id' })
  vehicleId: number;

  @ManyToOne(() => Cooperation, (cooperation) => cooperation.deliveryBills, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

  @Column({ name: 'cooperation_id' })
  cooperationId: number;

  @Column({ type: 'timestamptz' })
  deliveryDate: Date;

  @Column()
  deliveryAddress: string;

  @Column({ nullable: true })
  receiveAddress?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  receiverName?: string;

  @Column({ nullable: true })
  receiverPhone?: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: '0.00' })
  distanceKm: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  subtotal: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0.00' })
  total: string;

  @Column({ type: 'int', default: 0 })
  travelPointsUsed: number;

  @Column({ default: false })
  travelPointsRefunded: boolean;

  @ManyToOne(() => Voucher, (voucher) => voucher.deliveryBills, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'voucher_id' })
  voucher?: Voucher;

  @Column({ name: 'voucher_id', nullable: true })
  voucherId?: number;

  @Column({
    type: 'enum',
    enum: DeliveryBillStatus,
    default: DeliveryBillStatus.PENDING,
  })
  status: DeliveryBillStatus;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
