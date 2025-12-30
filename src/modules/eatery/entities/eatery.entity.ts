import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('eateries')
export class Eatery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  province: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
