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
import { TravelRoute } from '../../travel-route/entities/travel-route.entity';
import { Destination } from '../../destination/entities/destinations.entity';
import { RentalVehicle } from '../../rental-vehicle/entities/rental-vehicle.entity';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { Eatery } from '../../eatery/entities/eatery.entity';
import { FeedbackReply } from './feedback-reply.entity';
import { FeedbackReaction } from './feedback-reaction.entity';

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

  @ManyToOne(() => Eatery, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'eateryId' })
  eatery?: Eatery;

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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => FeedbackReply, (reply) => reply.feedback, { cascade: true })
  replies: FeedbackReply[];

  @OneToMany(() => FeedbackReaction, (reaction) => reaction.feedback, {
    cascade: true,
  })
  reactions: FeedbackReaction[];
}
