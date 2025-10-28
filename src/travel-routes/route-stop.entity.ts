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
import { Destination } from '../destinations/destinations.entity';

@Entity('route_stops')
export class RouteStop {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TravelRoute, (route) => route.stops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route: TravelRoute;

  @Column({ name: 'route_id' })
  routeId: number;

  @ManyToOne(() => Destination, (destination) => destination.routeStops, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'destination_id' })
  destination?: Destination;

  @Column({ name: 'destination_id', nullable: true })
  destinationId?: number;

  @Column({ nullable: true })
  destinationExternalId?: string;

  @Column({ type: 'int' })
  dayOrder: number;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ nullable: true })
  uniqueKey?: string;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
