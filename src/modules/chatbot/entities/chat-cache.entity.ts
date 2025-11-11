import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ChatCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text' })
  response: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
