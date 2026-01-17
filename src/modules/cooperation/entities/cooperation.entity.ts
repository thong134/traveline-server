import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
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
import { CommissionType, CooperationStatus } from './cooperation-enums';
import { CooperationContract } from './cooperation-contract.entity';
import { CooperationServiceConfig } from './cooperation-service-config.entity';

@Entity('cooperations')
export class Cooperation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true, unique: true })
  code?: string;

  @Column({ default: 'hotel' })
  type: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  province?: string;

  @Column({ nullable: true })
  wardCode?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ nullable: true })
  brandLogo?: string;

  @Column({ nullable: true })
  photo?: string;

  @Column({ nullable: true })
  extension?: string;

  @Column({ type: 'text', nullable: true })
  introduction?: string;

  @Column({
    type: 'enum',
    enum: CooperationStatus,
    default: CooperationStatus.PENDING,
  })
  status: CooperationStatus;

  @Column({
    type: 'enum',
    enum: CommissionType,
    nullable: true,
  })
  commissionType?: CommissionType;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  commissionValue?: string;

  @Column({ nullable: true })
  taxId?: string;

  @Column({ nullable: true })
  representativeName?: string;

  @Column({ nullable: true })
  representativePhone?: string;

  @Column({ nullable: true })
  representativeEmail?: string;

  @Column({ nullable: true })
  businessLicense?: string;

  @Column({ nullable: true })
  representativeIdCard?: string;

  @Column({ nullable: true })
  paymentQr?: string;

  @Column({ nullable: true })
  currentContractUrl?: string;

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

  @OneToMany(() => CooperationContract, (contract) => contract.cooperation)
  contracts: CooperationContract[];

  @OneToOne(() => CooperationServiceConfig, (config) => config.cooperation)
  serviceConfig: CooperationServiceConfig;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
