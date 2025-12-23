import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RentalVehicle } from './rental-vehicle.entity';

@Entity('rental_vehicle_maintenance')
export class RentalVehicleMaintenance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RentalVehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'licensePlate' })
  vehicle: RentalVehicle;

  @Column({ length: 32 })
  licensePlate: string;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz' })
  endDate: Date;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
