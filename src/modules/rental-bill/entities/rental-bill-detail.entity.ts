import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RentalBill } from './rental-bill.entity';
import { RentalVehicle } from '../../rental-vehicle/entities/rental-vehicle.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('rental_bill_details')
export class RentalBillDetail {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RentalBill, (bill: RentalBill) => bill.details, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'billId' })
  bill: RentalBill;

  @ApiProperty()
  @Column()
  billId: number;

  @ApiProperty({ type: () => RentalVehicle })
  @ManyToOne(
    () => RentalVehicle,
    (vehicle: RentalVehicle) => vehicle.billDetails,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'licensePlate' })
  vehicle: RentalVehicle;

  @ApiProperty()
  @Column()
  licensePlate: string;

  @ApiProperty()
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price: string;

  @ApiPropertyOptional()
  @Column({ nullable: true })
  note?: string;
}
