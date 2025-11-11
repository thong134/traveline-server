import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('phone_otps')
export class PhoneOtp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phone: string;

  @Column({ name: 'codeHash' })
  sessionHash: string; // bcrypt hash of Firebase sessionInfo

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
