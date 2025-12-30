import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TravelRoute } from './travel-route.entity';
import { Destination } from '../../destination/entities/destinations.entity';

export enum RouteStopStatus {
  UPCOMING = 'upcoming',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  MISSED = 'missed',
}

@Entity('route_stops')
export class RouteStop {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TravelRoute, (route) => route.stops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route: TravelRoute;

  @ManyToOne(() => Destination, (destination) => destination.routeStops, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'destination_id' })
  destination?: Destination;

  @Column({ type: 'int' })
  dayOrder: number;

  @Column({ type: 'int' })
  sequence: number;

  @Column({
    type: 'enum',
    enum: RouteStopStatus,
    default: RouteStopStatus.UPCOMING,
    nullable: true,
  })
  status: RouteStopStatus;

  @Column({ type: 'int', default: 0 })
  travelPoints: number;

  @Column({ nullable: true })
  startTime?: string;

  @Column({ nullable: true })
  endTime?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column('text', { array: true, default: '{}' })
  images: string[] = [];

  @Column('text', { array: true, default: '{}' })
  videos: string[] = [];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
