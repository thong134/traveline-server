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
import { HotelRoom } from '../../hotel/room/entities/hotel-room.entity';
import { HotelBill } from '../../hotel/bill/entities/hotel-bill.entity';
import { DeliveryVehicle } from '../../delivery/delivery-vehicle/entities/delivery-vehicle.entity';
import { DeliveryBill } from '../../delivery/bill/entities/delivery-bill.entity';
import { RestaurantTable } from '../../restaurant/table/entities/restaurant-table.entity';
import { RestaurantBooking } from '../../restaurant/booking/entities/restaurant-booking.entity';
import { BusType } from '../../bus/bus/entities/bus-type.entity';
import { BusBill } from '../../bus/bill/entities/bus-bill.entity';
import { TrainRoute } from '../../train/train/entities/train-route.entity';
import { TrainBill } from '../../train/bill/entities/train-bill.entity';
import { Flight } from '../../flight/flight/entities/flight.entity';
import { FlightBill } from '../../flight/bill/entities/flight-bill.entity';

@Entity('cooperations')
export class Cooperation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  code?: string;

  @Column()
  name: string;

  @Column({ default: 'hotel' })
  type: string;

  @Column({ type: 'int', default: 0 })
  numberOfObjects: number;

  @Column({ type: 'int', default: 0 })
  numberOfObjectTypes: number;

  @Column({ nullable: true })
  bossName?: string;

  @Column({ nullable: true })
  bossPhone?: string;

  @Column({ nullable: true })
  bossEmail?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  district?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  province?: string;

  @Column({ nullable: true })
  photo?: string;

  @Column({ nullable: true })
  extension?: string;

  @Column({ type: 'text', nullable: true })
  introduction?: string;

  @Column({ type: 'date', nullable: true })
  contractDate?: Date;

  @Column({ nullable: true })
  contractTerm?: string;

  @Column({ nullable: true })
  bankAccountNumber?: string;

  @Column({ nullable: true })
  bankAccountName?: string;

  @Column({ nullable: true })
  bankName?: string;

  @Column({ type: 'int', default: 0 })
  bookingTimes: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  revenue: string;

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 0 })
  averageRating: string;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => User, (user: User) => user.cooperations, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  manager?: User;

  @OneToMany(() => HotelRoom, (room: HotelRoom) => room.cooperation)
  rooms: HotelRoom[];

  @OneToMany(() => HotelBill, (bill: HotelBill) => bill.cooperation)
  hotelBills: HotelBill[];

  @OneToMany(
    () => DeliveryVehicle,
    (vehicle: DeliveryVehicle) => vehicle.cooperation,
  )
  deliveryVehicles: DeliveryVehicle[];

  @OneToMany(() => DeliveryBill, (bill: DeliveryBill) => bill.cooperation)
  deliveryBills: DeliveryBill[];

  @OneToMany(() => RestaurantTable, (table) => table.cooperation)
  restaurantTables: RestaurantTable[];

  @OneToMany(() => RestaurantBooking, (booking) => booking.cooperation)
  restaurantBookings: RestaurantBooking[];

  @OneToMany(() => BusType, (type) => type.cooperation)
  busTypes: BusType[];

  @OneToMany(() => BusBill, (bill) => bill.cooperation)
  busBills: BusBill[];

  @OneToMany(() => TrainRoute, (route) => route.cooperation)
  trainRoutes: TrainRoute[];

  @OneToMany(() => TrainBill, (bill) => bill.cooperation)
  trainBills: TrainBill[];

  @OneToMany(() => Flight, (flight) => flight.cooperation)
  flights: Flight[];

  @OneToMany(() => FlightBill, (bill) => bill.cooperation)
  flightBills: FlightBill[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
