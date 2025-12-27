import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('ai_moderation_logs')
export class AiModerationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb' })
  aiResponse: Record<string, any>;

  @Column()
  decision: string;

  @Column({ type: 'int', nullable: true })
  userId?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
