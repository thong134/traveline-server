import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Feedback } from './feedback.entity';
import { User } from '../../user/entities/user.entity';

export enum FeedbackReactionType {
  LIKE = 'like',
  LOVE = 'love',
}

@Entity('feedback_reactions')
@Unique(['feedback', 'user', 'type'])
export class FeedbackReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Feedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feedback_id' })
  feedback: Feedback;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: FeedbackReactionType, default: FeedbackReactionType.LIKE })
  type: FeedbackReactionType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

