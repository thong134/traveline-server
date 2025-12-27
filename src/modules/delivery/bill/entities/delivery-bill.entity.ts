import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../user/entities/user.entity';
import { DeliveryVehicle } from '../../delivery-vehicle/entities/delivery-vehicle.entity';
import { Voucher } from '../../../voucher/entities/voucher.entity';
import { Cooperation } from '../../../cooperation/entities/cooperation.entity';


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

  @ManyToOne(() => DeliveryVehicle, (vehicle) => vehicle.bills, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: DeliveryVehicle;

  @ManyToOne(() => Cooperation, (cooperation) => cooperation.deliveryBills, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

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

  @Column({
    type: 'enum',
    enum: DeliveryBillStatus,
    default: DeliveryBillStatus.PENDING,
  })
  status: DeliveryBillStatus;

  @Column({ nullable: true })
  contactName?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  paymentMethod?: string;



  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
