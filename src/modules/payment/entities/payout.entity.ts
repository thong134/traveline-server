import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

import { ServiceType } from './booking-transaction.entity';

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  rentalId?: number;

  @Column({ type: 'enum', enum: ServiceType, default: ServiceType.RENTAL })
  serviceType: ServiceType;

  @Column({ type: 'int', nullable: true })
  billId?: number;

  @Column({ type: 'int' })
  ownerUserId: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Column({ nullable: true })
  bankName?: string;

  @Column({ nullable: true })
  bankAccountNumber?: string;

  @Column({ nullable: true })
  bankAccountName?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
