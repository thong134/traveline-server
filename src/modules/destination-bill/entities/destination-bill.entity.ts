import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Destination } from '../../destination/entities/destinations.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DestinationBillStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('destination_bills')
export class DestinationBill {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Mã đơn hàng duy nhất' })
  @Column({ unique: true })
  code: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty()
  @Column()
  userId: number;

  @ManyToOne(() => Destination, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'destinationId' })
  destination: Destination;

  @ApiProperty()
  @Column()
  destinationId: number;

  @ApiProperty()
  @Column({ type: 'int' })
  ticketQuantity: number;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  pricePerTicket: string;

  @ApiProperty({ description: 'Tổng tiền đơn hàng' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: string;

  @ApiProperty({ enum: DestinationBillStatus })
  @Column({
    type: 'enum',
    enum: DestinationBillStatus,
    default: DestinationBillStatus.PENDING,
  })
  status: DestinationBillStatus;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  paymentMethod?: string; // e.g., 'momo', 'vnpay', 'qr_code'

  @ApiPropertyOptional()
  @Column({ nullable: true })
  contactName?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  contactPhone?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  contactEmail?: string;

  @ApiPropertyOptional()
  @Column({ type: 'date', nullable: true })
  visitDate?: string;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
