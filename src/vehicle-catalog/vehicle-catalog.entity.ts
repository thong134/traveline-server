import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vehicle_catalog')
export class VehicleCatalog {
  @PrimaryGeneratedColumn()
  id: number;

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

  // Relation defined on RentalVehicle side; omit inverse to keep import scripts lightweight.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
