import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';
import { TravelRoute } from '../travel-routes/travel-route.entity';
import { Destination } from '../destinations/destinations.entity';

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

  @Column({ name: 'user_id', nullable: true })
  userId?: number;

  @Column({ nullable: true })
  userUid?: string;

  @ManyToOne(() => TravelRoute, (route) => route.feedbacks, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'travel_route_id' })
  travelRoute?: TravelRoute;

  @Column({ name: 'travel_route_id', nullable: true })
  travelRouteId?: number;

  @ManyToOne(() => Destination, (destination) => destination.feedbacks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'destination_id' })
  destination?: Destination;

  @Column({ name: 'destination_id', nullable: true })
  destinationId?: number;

  @Column({ nullable: true })
  licensePlate?: string;

  @Column({ nullable: true })
  cooperationId?: string;

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

  @Column({ type: 'timestamp', nullable: true })
  feedbackDate?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
