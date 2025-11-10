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
import { VehicleCatalog } from '../vehicle-catalog/vehicle-catalog.entity';
import { RentalBillDetail } from '../rental-bills/rental-bill-detail.entity';

export enum RentalVehicleApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INACTIVE = 'inactive',
}

export enum RentalVehicleAvailabilityStatus {
  AVAILABLE = 'available',
  //UNAVAILABLE = 'unavailable',
  RENTED = 'rented',
  MAINTENANCE = 'maintenance',
}

@Entity('rental_vehicles')
export class RentalVehicle {
  @PrimaryColumn({ length: 32 })
  licensePlate: string;

  @ManyToOne(
    () => RentalContract,
    (contract: RentalContract) => contract.vehicles,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'contractId' })
  contract: RentalContract;

  @Column()
  contractId: number;

  @ManyToOne(() => VehicleCatalog, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'vehicleCatalogId' })
  vehicleCatalog?: VehicleCatalog;

  @Column({ nullable: true })
  vehicleCatalogId?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pricePerHour: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pricePerDay: string;

  @Column({ nullable: true })
  requirements?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: RentalVehicleApprovalStatus,
    default: RentalVehicleApprovalStatus.PENDING,
  })
  status: RentalVehicleApprovalStatus;

  @Column({ nullable: true })
  rejectedReason?: string;

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
