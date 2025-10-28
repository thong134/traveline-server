import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RentalBill } from './rental-bill.entity';
import { RentalVehicle } from '../rental-vehicles/rental-vehicle.entity';

@Entity('rental_bill_details')
export class RentalBillDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RentalBill, (bill: RentalBill) => bill.details, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'billId' })
  bill: RentalBill;

  @Column()
  billId: number;

  @ManyToOne(
    () => RentalVehicle,
    (vehicle: RentalVehicle) => vehicle.billDetails,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'licensePlate' })
  vehicle: RentalVehicle;

  @Column()
  licensePlate: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ nullable: true })
  note?: string;
}
