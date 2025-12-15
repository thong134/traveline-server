import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Feedback } from './feedback.entity';
import { User } from '../../user/entities/user.entity';

@Entity('feedback_likes')
@Unique('uq_feedback_like', ['feedback', 'user'])
export class FeedbackLike {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Feedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feedback_id' })
  feedback: Feedback;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

