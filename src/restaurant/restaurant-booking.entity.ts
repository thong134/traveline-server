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
import { RestaurantTable } from './restaurant-table.entity';
import { Cooperation } from '../cooperations/cooperation.entity';

export enum RestaurantBookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SEATED = 'SEATED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('restaurant_bookings')
export class RestaurantBooking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @ManyToOne(() => User, (user) => user.restaurantBookings, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => RestaurantTable, (table) => table.bookings, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'table_id' })
  table: RestaurantTable;

  @Column({ name: 'table_id' })
  tableId: number;

  @ManyToOne(
    () => Cooperation,
    (cooperation) => cooperation.restaurantBookings,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

  @Column({ name: 'cooperation_id' })
  cooperationId: number;

  @Column({ type: 'timestamptz' })
  checkInDate: Date;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({ type: 'int', default: 1 })
  numberOfGuests: number;

  @Column({ nullable: true })
  contactName?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({
    type: 'enum',
    enum: RestaurantBookingStatus,
    default: RestaurantBookingStatus.PENDING,
  })
  status: RestaurantBookingStatus;

  @Column({ type: 'text', nullable: true })
  statusReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
