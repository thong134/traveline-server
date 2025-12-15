import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserWallet } from './user-wallet.entity';

export enum WalletTransactionType {
  DEPOSIT = 'DEPOSIT',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  REWARD = 'REWARD',
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserWallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet: UserWallet;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: WalletTransactionType })
  type: WalletTransactionType;

  @Column({ name: 'reference_id', nullable: true })
  @Index()
  referenceId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
