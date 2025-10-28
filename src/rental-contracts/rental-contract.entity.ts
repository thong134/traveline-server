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
import { User } from '../users/entities/user.entity';
import { RentalVehicle } from '../rental-vehicles/rental-vehicle.entity';

export enum RentalContractStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

@Entity('rental_contracts')
export class RentalContract {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, unique: true })
  externalId?: string;

  @ManyToOne(() => User, (user: User) => user.rentalContracts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({ nullable: true })
  fullName?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  identificationNumber?: string;

  @Column({ nullable: true })
  identificationPhoto?: string;

  @Column({ default: 'personal' })
  businessType: string;

  @Column({ nullable: true })
  businessName?: string;

  @Column({ nullable: true })
  businessProvince?: string;

  @Column({ nullable: true })
  businessCity?: string;

  @Column({ nullable: true })
  businessAddress?: string;

  @Column({ nullable: true })
  taxCode?: string;

  @Column({ nullable: true })
  businessRegisterPhoto?: string;

  @Column({ nullable: true })
  citizenFrontPhoto?: string;

  @Column({ nullable: true })
  citizenBackPhoto?: string;

  @Column({ nullable: true })
  contractTerm?: string;

  @Column({ nullable: true })
  notes?: string;

  @Column({ nullable: true })
  bankName?: string;

  @Column({ nullable: true })
  bankAccountNumber?: string;

  @Column({ nullable: true })
  bankAccountName?: string;

  @Column({ default: false })
  termsAccepted: boolean;

  @Column({
    type: 'enum',
    enum: RentalContractStatus,
    default: RentalContractStatus.PENDING,
  })
  status: RentalContractStatus;

  @Column({ nullable: true })
  statusReason?: string;

  @Column({ type: 'timestamptz', nullable: true })
  statusUpdatedAt?: Date;

  @Column({ type: 'int', default: 0 })
  totalVehicles: number;

  @Column({ type: 'int', default: 0 })
  totalRentalTimes: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 0 })
  averageRating: string;

  @OneToMany(() => RentalVehicle, (vehicle: RentalVehicle) => vehicle.contract)
  vehicles: RentalVehicle[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
