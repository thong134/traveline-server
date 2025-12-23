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
import { Cooperation } from '../../../cooperation/entities/cooperation.entity';
import { FlightBill } from '../../bill/entities/flight-bill.entity';

@Entity('flights')
export class Flight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  flightNumber: string;

  @ManyToOne(() => Cooperation, (cooperation) => cooperation.flights, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;

  @Column()
  airline: string;

  @Column()
  departureAirport: string;

  @Column()
  arrivalAirport: string;

  @Column({ type: 'timestamptz' })
  departureTime: Date;

  @Column({ type: 'timestamptz' })
  arrivalTime: Date;

  @Column({ type: 'int', default: 0 })
  durationMinutes: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  basePrice: string;

  @Column({ type: 'int', default: 0 })
  seatCapacity: number;

  @Column({ nullable: true })
  cabinClass?: string;

  @Column({ nullable: true })
  baggageAllowance?: string;

  @Column({ nullable: true })
  photo?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @OneToMany(() => FlightBill, (bill) => bill.flight)
  bills: FlightBill[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
