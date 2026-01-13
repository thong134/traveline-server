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
import { User } from '../../user/entities/user.entity';
import { RentalVehicle } from '../../rental-vehicle/entities/rental-vehicle.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RentalContractStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

@Entity('rental_contracts')
export class RentalContract {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user: User) => user.rentalContracts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  citizenId?: string;

  @ApiProperty({ default: 'personal' })
  @Column({ default: 'personal' })
  businessType: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  businessName?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  businessAddress?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  taxCode?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  businessRegisterPhoto?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  citizenFrontPhoto?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  citizenBackPhoto?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  notes?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  bankName?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  bankAccountNumber?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  bankAccountName?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  fullName?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  email?: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  phoneNumber?: string;

  @ApiProperty({ default: false })
  @Column({ default: false })
  termsAccepted: boolean;

  @ApiProperty({ enum: RentalContractStatus })
  @Column({
    type: 'enum',
    enum: RentalContractStatus,
    default: RentalContractStatus.PENDING,
  })
  status: RentalContractStatus;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  rejectedReason?: string;

  @ApiPropertyOptional()
  @Column({ type: 'timestamptz', nullable: true })
  statusUpdatedAt?: Date;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  totalVehicles: number;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  totalRentalTimes: number;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 4, scale: 2, default: 0 })
  averageRating: string;

  @ApiPropertyOptional()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  businessLatitude?: number;

  @ApiPropertyOptional()
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  businessLongitude?: number;

  @OneToMany(() => RentalVehicle, (vehicle: RentalVehicle) => vehicle.contract)
  vehicles: RentalVehicle[];

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
