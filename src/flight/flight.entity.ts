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
import { Cooperation } from '../cooperations/cooperation.entity';
import { FlightBill } from './flight-bill.entity';

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

  @Column({ name: 'cooperation_id' })
  cooperationId: number;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
