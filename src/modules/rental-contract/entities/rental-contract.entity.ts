import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { RentalVehicle } from '../../rental-vehicle/entities/rental-vehicle.entity';

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

  @ManyToOne(() => User, (user: User) => user.rentalContracts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @RelationId((contract: RentalContract) => contract.user)
  userId: number;

  @Column({ nullable: true })
  citizenId?: string;

  @Column({ default: 'personal' })
  businessType: string;

  @Column({ nullable: true })
  businessName?: string;

  @Column({ nullable: true })
  businessProvince?: string;

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

  @Column({ nullable: true })
  fullName?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ default: false })
  termsAccepted: boolean;

  @Column({
    type: 'enum',
    enum: RentalContractStatus,
    default: RentalContractStatus.PENDING,
  })
  status: RentalContractStatus;

  @Column({ nullable: true })
  rejectedReason?: string;

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
