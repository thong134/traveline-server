import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { TravelRoute } from './travel-route.entity';

@Entity('travel_route_likes')
@Unique(['user', 'travelRoute'])
export class TravelRouteLike {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => TravelRoute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'travel_route_id' })
  travelRoute: TravelRoute;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
