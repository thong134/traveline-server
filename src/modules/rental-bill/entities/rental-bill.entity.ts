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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

@Entity('rental_bills')
export class RentalBill {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Mã đơn hàng duy nhất' })
  @Column({ unique: true })
  code: string;

  @ManyToOne(() => User, (user: User) => user.rentalBills, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty()
  @Column()
  userId: number;

  @ApiProperty({ enum: RentalBillType })
  @Column({ type: 'enum', enum: RentalBillType, default: RentalBillType.DAILY })
  rentalType: RentalBillType;

  @ApiProperty()
  @Column({ type: 'timestamp' })
  startDate: Date;

  @ApiProperty()
  @Column({ type: 'timestamp' })
  endDate: Date;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  location?: string;

  @ApiProperty({ enum: RentalVehicleType })
  @Column({
    type: 'enum',
    enum: RentalVehicleType,
    default: RentalVehicleType.BIKE,
  })
  vehicleType: RentalVehicleType;

  @ApiProperty({
    description: 'Gói thuê (1h, 4h, 8h, 12h, 1d, 2d, 3d, 5d, 7d)',
  })
  @Column({ length: 32, default: '1d' })
  durationPackage: string;

  @ApiPropertyOptional({
    description: 'Phương thức thanh toán (momo, qr_code, ...)',
  })
  @Column({ type: 'varchar', length: 20, nullable: true })
  paymentMethod?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  contactName?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  contactPhone?: string;

  @ApiProperty({ description: 'Tổng tiền đơn hàng' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: string;

  @ApiProperty({ description: 'Tổng tiền thực nhận của chủ xe (không trừ voucher/points)' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  ownerTotal: string;

  @ManyToOne(() => Voucher, (voucher: Voucher) => voucher.rentalBills, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'voucherId' })
  voucher?: Voucher;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  voucherId?: number;

  @ApiProperty({ description: 'Số điểm TravelPoints đã sử dụng' })
  @Column({ type: 'int', default: 0 })
  travelPointsUsed: number;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  requiresEthDeposit: boolean;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  ownerEthAddress?: string;

  @ApiProperty({ enum: RentalBillStatus })
  @Column({
    type: 'enum',
    enum: RentalBillStatus,
    default: RentalBillStatus.PENDING,
  })
  status: RentalBillStatus;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  verifiedSelfiePhoto?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  notes?: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  cancelReason?: string;

  @ApiPropertyOptional({ enum: RentalBillCancelledBy })
  @Column({
    type: 'enum',
    enum: RentalBillCancelledBy,
    nullable: true,
  })
  cancelledBy?: RentalBillCancelledBy;

  @ApiProperty({ enum: RentalProgressStatus })
  @Column({
    type: 'enum',
    enum: RentalProgressStatus,
    default: RentalProgressStatus.PENDING,
  })
  rentalStatus: RentalProgressStatus;

  @ApiProperty({ description: 'Danh sách ảnh bàn giao xe từ chủ xe' })
  @Column('text', { array: true, default: '{}' })
  deliveryPhotos: string[];

  @ApiPropertyOptional({
    description: 'Ảnh selfie xác thực của khách khi nhận xe',
  })
  @Column({ nullable: true })
  pickupSelfiePhoto?: string;

  @ApiProperty({ description: 'Danh sách ảnh xe khi khách yêu cầu trả' })
  @Column('text', { array: true, default: '{}' })
  returnPhotosUser: string[];

  @ApiProperty({ description: 'Danh sách ảnh xe khi chủ xe xác nhận nhận lại' })
  @Column('text', { array: true, default: '{}' })
  returnPhotosOwner: string[];

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  returnTimestampUser?: Date;

  @ApiPropertyOptional()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  returnLatitudeUser?: number;

  @ApiPropertyOptional()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  returnLongitudeUser?: number;

  @ApiPropertyOptional()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  returnLatitudeOwner?: number;

  @ApiPropertyOptional()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  returnLongitudeOwner?: number;

  @ApiPropertyOptional()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  deliveryLatitudeOwner?: number;

  @ApiPropertyOptional()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  deliveryLongitudeOwner?: number;

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  deliveryDate?: Date;

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  returnDate?: Date;

  @ApiProperty({ description: 'Phí quá hạn đầu' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  overtimeFee: string;

  @ApiPropertyOptional()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  pickupLatitude?: number;

  @ApiPropertyOptional()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  pickupLongitude?: number;

  @ApiProperty({ description: 'Phí vận chuyển' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingFee: string;

  @ApiProperty({ description: 'Phí vận chuyển có thể thương lượng' })
  @Column({ type: 'boolean', default: false })
  isShippingFeeNegotiable: boolean;

  @ApiPropertyOptional({ description: 'Token cho link bàn giao khách' })
  @Column({ nullable: true })
  guestToken?: string;

  @ApiPropertyOptional()
  @Column({ type: 'timestamptz', nullable: true })
  guestTokenExpiresAt?: Date;

  @ApiProperty({ type: () => [RentalBillDetail] })
  @OneToMany(
    () => RentalBillDetail,
    (detail: RentalBillDetail) => detail.bill,
    { cascade: true },
  )
  details: RentalBillDetail[];

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
