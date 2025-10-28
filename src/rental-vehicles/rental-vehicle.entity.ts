import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RentalContract } from '../rental-contracts/rental-contract.entity';
import { VehicleInformation } from '../vehicle-information/vehicle-information.entity';
import { RentalBillDetail } from '../rental-bills/rental-bill-detail.entity';

export enum RentalVehicleApprovalStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INACTIVE = 'inactive',
}

export enum RentalVehicleAvailabilityStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  RENTED = 'rented',
  MAINTENANCE = 'maintenance',
}

@Entity('rental_vehicles')
export class RentalVehicle {
  @PrimaryColumn({ length: 32 })
  licensePlate: string;

  @Column({ nullable: true, unique: true })
  externalId?: string;

  @ManyToOne(
    () => RentalContract,
    (contract: RentalContract) => contract.vehicles,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'contractId' })
  contract: RentalContract;

  @Column()
  contractId: number;

  @ManyToOne(
    () => VehicleInformation,
    (info: VehicleInformation) => info.rentalVehicles,
    { nullable: true, onDelete: 'SET NULL' },
  )
  @JoinColumn({ name: 'vehicleInformationId' })
  vehicleInformation?: VehicleInformation;

  @Column({ nullable: true })
  vehicleInformationId?: number;

  @Column({ nullable: true })
  vehicleType?: string;

  @Column({ nullable: true })
  vehicleBrand?: string;

  @Column({ nullable: true })
  vehicleModel?: string;

  @Column({ nullable: true })
  vehicleColor?: string;

  @Column({ nullable: true })
  manufactureYear?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pricePerHour: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pricePerDay: string;

  @Column({ nullable: true })
  requirements?: string;

  @Column({ nullable: true })
  vehicleRegistrationFront?: string;

  @Column({ nullable: true })
  vehicleRegistrationBack?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  photoUrls: string[];

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: RentalVehicleApprovalStatus,
    default: RentalVehicleApprovalStatus.PENDING,
  })
  status: RentalVehicleApprovalStatus;

  @Column({ nullable: true })
  statusReason?: string;

  @Column({
    type: 'enum',
    enum: RentalVehicleAvailabilityStatus,
    default: RentalVehicleAvailabilityStatus.AVAILABLE,
  })
  availability: RentalVehicleAvailabilityStatus;

  @Column({ type: 'int', default: 0 })
  totalRentals: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 0 })
  averageRating: string;

  @OneToMany(
    () => RentalBillDetail,
    (detail: RentalBillDetail) => detail.vehicle,
  )
  billDetails: RentalBillDetail[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
