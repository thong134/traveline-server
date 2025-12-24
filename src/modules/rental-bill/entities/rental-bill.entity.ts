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
import { RentalVehicleType } from '../../rental-vehicle/enums/rental-vehicle.enum';

export enum RentalBillCancelledBy {
  USER = 'user',
  OWNER = 'owner',
}

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

export enum RentalProgressStatus {
  PENDING = 'pending',
  BOOKED = 'booked',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  IN_PROGRESS = 'in_progress',
  RETURN_REQUESTED = 'return_requested',
  RETURN_CONFIRMED = 'return_confirmed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  WALLET = 'wallet',
  MOMO = 'momo',
  QR_CODE = 'qr_code',
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

  @Column({
    type: 'enum',
    enum: RentalVehicleType,
    default: RentalVehicleType.BIKE,
  })
  vehicleType: RentalVehicleType;

  @Column({ length: 32, default: '1d' })
  durationPackage: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'payment_method_enum',
    nullable: true,
  })
  paymentMethod?: PaymentMethod;

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

  @Column({ type: 'text', nullable: true })
  cancelReason?: string;

  @Column({
    type: 'enum',
    enum: RentalBillCancelledBy,
    nullable: true,
  })
  cancelledBy?: RentalBillCancelledBy;

  @Column({
    type: 'enum',
    enum: RentalProgressStatus,
    default: RentalProgressStatus.PENDING,
  })
  rentalStatus: RentalProgressStatus;

  @Column('text', { array: true, default: '{}' })
  deliveryPhotos: string[];

  @Column({ nullable: true })
  pickupSelfiePhoto?: string;

  @Column('text', { array: true, default: '{}' })
  returnPhotosUser: string[];

  @Column('text', { array: true, default: '{}' })
  returnPhotosOwner: string[];

  @Column({ type: 'timestamptz', nullable: true })
  returnTimestampUser?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  returnLatitudeUser?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  returnLongitudeUser?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  returnLatitudeOwner?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  returnLongitudeOwner?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  overtimeFee: string;

  @OneToMany(
    () => RentalBillDetail,
    (detail: RentalBillDetail) => detail.bill,
    { cascade: true },
  )
  details: RentalBillDetail[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
