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
import { User } from '../users/entities/user.entity';
import { RouteStop } from './route-stop.entity';
import { Feedback } from '../feedback/feedback.entity';

@Entity('travel_routes')
export class TravelRoute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  ownerUid?: string;

  @ManyToOne(() => User, (user: User) => user.travelRoutes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id', nullable: true })
  userId?: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  province?: string;

  @Column({ type: 'int', default: 1 })
  numberOfDays: number;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
