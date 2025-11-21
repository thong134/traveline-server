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

  @Column()
  name: string;

  @Column()
  province: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
