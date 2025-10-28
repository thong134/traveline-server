import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RentalVehicle } from '../rental-vehicles/rental-vehicle.entity';

@Entity('vehicle_information')
export class VehicleInformation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  externalId?: string;

  @Column()
  type: string;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  color: string;

  @Column({ type: 'int', default: 0 })
  seatingCapacity: number;

  @Column({ nullable: true })
  fuelType?: string;

  @Column({ nullable: true })
  maxSpeed?: string;

  @Column({ nullable: true })
  transmission?: string;

  @Column({ nullable: true })
  photo?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  defaultRequirements: string[];

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  defaultPricePerHour?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  defaultPricePerDay?: string;

  @Column({ default: true })
  active: boolean;

  @OneToMany(
    () => RentalVehicle,
    (vehicle: RentalVehicle) => vehicle.vehicleInformation,
  )
  rentalVehicles: RentalVehicle[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
