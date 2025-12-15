import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { TravelRoute } from '../../travel-route/entities/travel-route.entity';
import { Destination } from '../../destination/entities/destinations.entity';
import { RentalVehicle } from '../../rental-vehicle/entities/rental-vehicle.entity';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.feedbacks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ nullable: true })
  userUid?: string;

  @ManyToOne(() => TravelRoute, (route) => route.feedbacks, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'travel_route_id' })
  travelRoute?: TravelRoute;

  @ManyToOne(() => Destination, (destination) => destination.feedbacks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'destination_id' })
  destination?: Destination;

  @ManyToOne(() => RentalVehicle, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'licensePlate', referencedColumnName: 'licensePlate' })
  rentalVehicle?: RentalVehicle;

  @ManyToOne(() => Cooperation, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'cooperationId' })
  cooperation?: Cooperation;

  @Column({ type: 'int', default: 0 })
  star: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column('text', { array: true, default: '{}' })
  photos: string[] = [];

  @Column('text', { array: true, default: '{}' })
  videos: string[] = [];

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
