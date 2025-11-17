import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BlockchainTransactionType {
  DEPOSIT = 'deposit',
  RELEASE = 'release',
  REFUND = 'refund',
}

export enum BlockchainTransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

@Entity({ name: 'rental_blockchain_transactions' })
export class RentalTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  rentalId: number;

  @Column({ type: 'varchar', length: 66 })
  txHash: string;

  @Column({ type: 'varchar', length: 42 })
  fromAddress: string;

  @Column({ type: 'varchar', length: 42 })
  toAddress: string;

  @Column({
    type: 'enum',
    enum: BlockchainTransactionType,
  })
  transactionType: BlockchainTransactionType;

  @Column({
    type: 'enum',
    enum: BlockchainTransactionStatus,
    default: BlockchainTransactionStatus.PENDING,
  })
  status: BlockchainTransactionStatus;

  @Column({ type: 'numeric', precision: 78, scale: 0, default: '0' })
  amountWei: string;

  @Column({ type: 'numeric', precision: 26, scale: 18, default: '0' })
  amountEth: string;

  @Column({ type: 'text', nullable: true })
  errorReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
