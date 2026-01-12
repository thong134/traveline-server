import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ServiceType {
  HOTEL = 'HOTEL',
  RESTAURANT = 'RESTAURANT',
  DELIVERY = 'DELIVERY',
  BUS = 'BUS',
  TRAIN = 'TRAIN',
  FLIGHT = 'FLIGHT',
  TOUR = 'TOUR',
}

export enum TransactionPaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

@Entity('booking_transactions')
export class BookingTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  cooperationId?: number;

  @Column({ nullable: true })
  userId?: number;

  @Column({
    type: 'enum',
    enum: ServiceType,
  })
  serviceType: ServiceType;

  @Column({ nullable: true })
  bookingId?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  commissionAmount: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  partnerAmount: string;

  @Column({
    type: 'enum',
    enum: TransactionPaymentStatus,
    default: TransactionPaymentStatus.PENDING,
  })
  paymentStatus: TransactionPaymentStatus;

  @CreateDateColumn()
  transactionDate: Date;
}
