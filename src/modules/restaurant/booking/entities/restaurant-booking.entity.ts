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
import { RestaurantTable } from '../../table/entities/restaurant-table.entity';
import { Cooperation } from '../../../cooperation/entities/cooperation.entity';

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

  @ManyToOne(() => RestaurantTable, (table) => table.bookings, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'table_id' })
  table: RestaurantTable;

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

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({
    type: 'enum',
    enum: RestaurantBookingStatus,
    default: RestaurantBookingStatus.PENDING,
  })
  status: RestaurantBookingStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
