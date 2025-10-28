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
import { HotelBillDetail } from '../hotel-bills/hotel-bill-detail.entity';

@Entity('hotel_rooms')
export class HotelRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(
    () => Cooperation,
    (cooperation: Cooperation) => cooperation.rooms,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

  @Column({ name: 'cooperation_id' })
  cooperationId: number;

  @Column({ type: 'int', default: 1 })
  numberOfBeds: number;

  @Column({ type: 'int', default: 1 })
  maxPeople: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  area?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: string;

  @Column({ type: 'int', default: 1 })
  numberOfRooms: number;

  @Column({ nullable: true })
  photo?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column('text', { array: true, default: '{}' })
  amenities: string[];

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'int', default: 0 })
  totalBookings: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenue: string;

  @OneToMany(() => HotelBillDetail, (detail: HotelBillDetail) => detail.room)
  billDetails: HotelBillDetail[];

  // Computed at runtime for availability queries
  availableRooms?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
