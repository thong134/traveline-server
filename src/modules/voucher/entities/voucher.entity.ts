import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HotelBill } from '../../hotel/bill/entities/hotel-bill.entity';
import { DeliveryBill } from '../../delivery/bill/entities/delivery-bill.entity';
import { BusBill } from '../../bus/bill/entities/bus-bill.entity';
import { TrainBill } from '../../train/bill/entities/train-bill.entity';
import { FlightBill } from '../../flight/bill/entities/flight-bill.entity';
import { RentalBill } from '../../rental-bill/entities/rental-bill.entity';

export type VoucherDiscountType = 'percentage' | 'fixed';

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ['percentage', 'fixed'], default: 'fixed' })
  discountType: VoucherDiscountType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  value: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscountValue?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minOrderValue?: string;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'int', default: 0 })
  maxUsage: number;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => HotelBill, (bill: HotelBill) => bill.voucher)
  hotelBills: HotelBill[];

  @OneToMany(() => DeliveryBill, (bill: DeliveryBill) => bill.voucher)
  deliveryBills: DeliveryBill[];

  @OneToMany(() => BusBill, (bill: BusBill) => bill.voucher)
  busBills: BusBill[];

  @OneToMany(() => TrainBill, (bill: TrainBill) => bill.voucher)
  trainBills: TrainBill[];

  @OneToMany(() => FlightBill, (bill: FlightBill) => bill.voucher)
  flightBills: FlightBill[];

  @OneToMany(() => RentalBill, (bill: RentalBill) => bill.voucher)
  rentalBills: RentalBill[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
