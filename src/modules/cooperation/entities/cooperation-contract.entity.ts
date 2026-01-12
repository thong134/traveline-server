import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cooperation } from './cooperation.entity';

@Entity('cooperation_contracts')
export class CooperationContract {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cooperationId: number;

  @ManyToOne(() => Cooperation, (cooperation) => cooperation.contracts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cooperationId' })
  cooperation: Cooperation;

  @Column()
  contractUrl: string;

  @Column({ type: 'date', nullable: true })
  signedDate?: Date;

  @Column({ type: 'date', nullable: true })
  expiryDate?: Date;

  @Column({ type: 'text', nullable: true })
  terms?: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
