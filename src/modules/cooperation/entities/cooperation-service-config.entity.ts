import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cooperation } from './cooperation.entity';

@Entity('cooperation_service_configs')
export class CooperationServiceConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cooperationId: number;

  @Column({ nullable: true })
  apiBaseUrl?: string;

  @Column({ nullable: true })
  apiKey?: string;

  @Column({ nullable: true })
  apiEndpointCheck?: string;

  @Column({ type: 'jsonb', nullable: true })
  serviceData?: any;

  @OneToOne(() => Cooperation, (field) => field.serviceConfig)
  @JoinColumn({ name: 'cooperation_id' })
  cooperation: Cooperation;
}
