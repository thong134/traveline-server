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
import { RouteStop } from './route-stop.entity';
import { Feedback } from '../../feedback/entities/feedback.entity';

export enum TravelRouteStatus {
  DRAFT = 'draft',
  UPCOMING = 'upcoming',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  MISSED = 'missed',
}

@Entity('travel_routes')
export class TravelRoute {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user: User) => user.travelRoutes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => TravelRoute, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cloned_from_route_id' })
  clonedFromRoute?: TravelRoute;

  @Column()
  name: string;

  @Column({ nullable: true })
  province?: string;

  @Column({ type: 'date', nullable: true })
  startDate?: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  @OneToMany(() => RouteStop, (stop: RouteStop) => stop.route, {
    cascade: true,
  })
  stops: RouteStop[];

  @OneToMany(() => Feedback, (feedback: Feedback) => feedback.travelRoute)
  feedbacks: Feedback[];

  @Column({ type: 'int', default: 0 })
  totalTravelPoints: number;

  @Column({ type: 'double precision', default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  favouriteTimes: number;

  @Column({
    type: 'enum',
    enum: TravelRouteStatus,
    default: TravelRouteStatus.DRAFT,
    nullable: true,
  })
  status: TravelRouteStatus;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: false })
  isEdited: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
