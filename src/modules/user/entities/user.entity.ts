import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { TravelRoute } from '../../travel-route/entities/travel-route.entity';
import { Feedback } from '../../feedback/entities/feedback.entity';
import { RentalContract } from '../../rental-contract/entities/rental-contract.entity';
import { RentalBill } from '../../rental-bill/entities/rental-bill.entity';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { HotelBill } from '../../hotel/bill/entities/hotel-bill.entity';
import { DeliveryBill } from '../../delivery/bill/entities/delivery-bill.entity';
import { RestaurantBooking } from '../../restaurant/booking/entities/restaurant-booking.entity';
import { BusBill } from '../../bus/bill/entities/bus-bill.entity';
import { TrainBill } from '../../train/bill/entities/train-bill.entity';
import { FlightBill } from '../../flight/bill/entities/flight-bill.entity';
import { UserWallet } from '../../wallet/entities/user-wallet.entity';
import { UserRole } from './user-role.enum';
import { UserTier } from './user-tier.enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'fcm_token', nullable: true })
  fcmToken?: string;

  @Column()
  password: string; // bcrypt hash

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isPhoneVerified: boolean;

  @Column({ default: false })
  isCitizenIdVerified: boolean;

  @OneToMany(() => RefreshToken, (rt: RefreshToken) => rt.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => TravelRoute, (route: TravelRoute) => route.user)
  travelRoutes: TravelRoute[];

  @OneToMany(() => Feedback, (feedback: Feedback) => feedback.user)
  feedbacks: Feedback[];

  @OneToMany(() => RentalContract, (contract: RentalContract) => contract.user)
  rentalContracts: RentalContract[];

  @OneToMany(() => RentalBill, (bill: RentalBill) => bill.user)
  rentalBills: RentalBill[];

  @OneToMany(
    () => Cooperation,
    (cooperation: Cooperation) => cooperation.manager,
  )
  cooperations: Cooperation[];

  @OneToMany(() => HotelBill, (bill: HotelBill) => bill.user)
  hotelBills: HotelBill[];

  @OneToMany(() => DeliveryBill, (bill: DeliveryBill) => bill.user)
  deliveryBills: DeliveryBill[];

  @OneToMany(
    () => RestaurantBooking,
    (booking: RestaurantBooking) => booking.user,
  )
  restaurantBookings: RestaurantBooking[];

  @OneToMany(() => BusBill, (bill: BusBill) => bill.user)
  busBills: BusBill[];

  @OneToMany(() => TrainBill, (bill: TrainBill) => bill.user)
  trainBills: TrainBill[];

  @OneToMany(() => FlightBill, (bill: FlightBill) => bill.user)
  flightBills: FlightBill[];

  @OneToOne(() => UserWallet, (wallet: UserWallet) => wallet.user)
  wallet?: UserWallet;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ nullable: true })
  citizenId: string;

  @Column({ nullable: true })
  idCardImageUrl?: string;

  @Column({ nullable: true })
  citizenFrontImageUrl?: string;

  @Column({ nullable: true })
  citizenBackImageUrl?: string;

  @Column({ nullable: true })
  bankName?: string;

  @Column({ nullable: true })
  bankAccountNumber?: string;

  @Column({ nullable: true })
  bankAccountName?: string;

  @Column('text', { array: true, default: '{}' })
  hobbies: string[] = [];

  @Column('text', { array: true, default: '{}' })
  favoriteDestinationIds: string[] = [];

  @Column('text', { array: true, default: '{}' })
  favoriteEateries: string[] = [];

  @Column('text', { array: true, default: '{}' })
  cooperationIds: string[] = [];

  @Column({ type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'int', default: 0 })
  travelPoint: number;

  @Column({ type: 'int', default: 0 })
  travelExp: number;

  @Column({ type: 'int', default: 0 })
  travelTrip: number;

  @Column({ type: 'int', default: 0 })
  feedbackTimes: number;

  @Column({
    type: 'enum',
    enum: UserTier,
    default: UserTier.EXPLORER,
  })
  userTier: UserTier;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    default: UserRole.User,
  })
  role: UserRole;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
