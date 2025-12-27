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
import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty()
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

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  star: number;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  comment?: string;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  })
  status: string;

  @ApiProperty()
  @Column('text', { array: true, default: '{}' })
  photos: string[] = [];

  @ApiProperty()
  @Column('text', { array: true, default: '{}' })
  videos: string[] = [];

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => FeedbackReply, (reply) => reply.feedback, { cascade: true })
  replies: FeedbackReply[];

  @OneToMany(() => FeedbackReaction, (reaction) => reaction.feedback, {
    cascade: true,
  })
  reactions: FeedbackReaction[];
}
