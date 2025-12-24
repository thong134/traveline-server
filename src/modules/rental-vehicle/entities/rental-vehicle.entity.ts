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
import { RentalContract } from '../../rental-contract/entities/rental-contract.entity';
import { VehicleCatalog } from '../../vehicle-catalog/entities/vehicle-catalog.entity';
import { RentalBillDetail } from '../../rental-bill/entities/rental-bill-detail.entity';

import {
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
  RentalVehicleType,
} from '../enums/rental-vehicle.enum';

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

  @Column({
    type: 'enum',
    enum: RentalVehicleType,
    default: RentalVehicleType.BIKE,
  })
  vehicleType: RentalVehicleType;

  // Base prices (required)
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pricePerHour: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pricePerDay: string;

  // Hourly packages (optional)
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor4Hours?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor8Hours?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor12Hours?: string;

  // Daily packages (optional)
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor2Days?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor3Days?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor5Days?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  priceFor7Days?: string;

  @Column({ nullable: true })
  requirements?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  vehicleRegistrationFront?: string;

  @Column({ nullable: true })
  vehicleRegistrationBack?: string;

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
    default: RentalVehicleAvailabilityStatus.UNAVAILABLE,
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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
