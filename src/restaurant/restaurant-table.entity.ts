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
import { Cooperation } from '../cooperations/cooperation.entity';
import { RestaurantBooking } from './restaurant-booking.entity';

@Entity('restaurant_tables')
export class RestaurantTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Cooperation, (cooperation) => cooperation.restaurantTables, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

  @Column({ name: 'cooperation_id' })
  cooperationId: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ nullable: true })
  dishType?: string;

  @Column({ nullable: true })
  priceRange?: string;

  @Column({ type: 'int', nullable: true })
  maxPeople?: number;

  @Column({ nullable: true })
  photo?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => RestaurantBooking, (booking) => booking.table)
  bookings: RestaurantBooking[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
