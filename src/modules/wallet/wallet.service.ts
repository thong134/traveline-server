import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { UserWallet } from './entities/user-wallet.entity';
import {
  WalletTransaction,
  WalletTransactionType,
} from './entities/wallet-transaction.entity';

export interface WalletOperationResult {
  balance: string;
  transactionId: number;
  amount: string;
  type: WalletTransactionType;
  referenceId?: string;
  currency: string;
}

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(UserWallet)
    private readonly walletRepo: Repository<UserWallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepo: Repository<WalletTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async createWallet(userId: number): Promise<UserWallet> {
    const existing = await this.walletRepo.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });
    if (existing) {
      return existing;
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} không tồn tại`);
    }

    const wallet = this.walletRepo.create({ balance: '0.00', user });
    return this.walletRepo.save(wallet);
  }

  async getBalance(userId: number): Promise<string> {
    const wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet.balance;
  }

  async deposit(
    userId: number,
    amount: number,
    referenceId?: string,
  ): Promise<WalletOperationResult> {
    const cents = this.toCents(amount);
    if (cents <= 0n) {
      throw new BadRequestException('Deposit amount must be greater than zero');
    }

    return this.adjustBalance({
      userId,
      delta: cents,
      type: WalletTransactionType.DEPOSIT,
      referenceId,
    });
  }

  async pay(
    userId: number,
    amount: number,
    referenceId?: string,
  ): Promise<WalletOperationResult> {
    const cents = this.toCents(amount);
    if (cents <= 0n) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    if (!referenceId) {
      throw new BadRequestException('referenceId is required for payments');
    }

    return this.adjustBalance({
      userId,
      delta: -cents,
      type: WalletTransactionType.PAYMENT,
      referenceId,
    });
  }

  async refund(
    userId: number,
    amount: number,
    referenceId?: string,
  ): Promise<WalletOperationResult> {
    const cents = this.toCents(amount);
    if (cents <= 0n) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    return this.adjustBalance({
      userId,
      delta: cents,
      type: WalletTransactionType.REFUND,
      referenceId,
    });
  }

  async reward(
    userId: number,
    amount: number,
    referenceId?: string,
  ): Promise<WalletOperationResult> {
    const cents = this.toCents(amount);
    if (cents <= 0n) {
      throw new BadRequestException('Reward amount must be greater than zero');
    }

    return this.adjustBalance({
      userId,
      delta: cents,
      type: WalletTransactionType.REWARD,
      referenceId,
    });
  }

  private async adjustBalance(params: {
    userId: number;
    delta: bigint;
    type: WalletTransactionType;
    referenceId?: string;
  }): Promise<WalletOperationResult> {
    const { userId, delta, type, referenceId } = params;

    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.getRepository(UserWallet).findOne({
        where: { user: { id: userId } },
        lock: { mode: 'pessimistic_write' },
        relations: { user: true },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const currentCents = this.decimalToCents(wallet.balance);
      const nextCents = currentCents + delta;

      if (nextCents < 0n) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      wallet.balance = this.centsToDecimal(nextCents);
      await manager.getRepository(UserWallet).save(wallet);

      const transaction = manager.getRepository(WalletTransaction).create({
        wallet,
        amount: this.centsToDecimal(delta),
        type,
        referenceId,
      });
      const persisted = (await manager
        .getRepository(WalletTransaction)
        .save(transaction)) as WalletTransaction;

      return {
        balance: wallet.balance,
        transactionId: persisted.id,
        amount: persisted.amount,
        type: persisted.type,
        referenceId: persisted.referenceId ?? undefined,
        currency: 'VND',
      };
    });
  }

  private toCents(value: number): bigint {
    return this.decimalToCents(value.toFixed(2));
  }

  private decimalToCents(value: number | string): bigint {
    const stringValue = typeof value === 'number' ? value.toString() : value;
    if (!stringValue || stringValue.trim().length === 0) {
      return 0n;
    }

    const trimmed = stringValue.trim();
    const negative = trimmed.startsWith('-');
    const absolute = negative ? trimmed.slice(1) : trimmed;
    const [integerPart, fractionalInput = '0'] = absolute.split('.');
    const safeInteger = integerPart.length ? integerPart : '0';
    const paddedFraction = `${fractionalInput}00`.slice(0, 2);

    let cents = BigInt(safeInteger) * 100n + BigInt(paddedFraction);
    if (negative) {
      cents *= -1n;
    }
    return cents;
  }

  private centsToDecimal(value: bigint): string {
    const negative = value < 0n;
    const absolute = negative ? -value : value;
    const integerPart = absolute / 100n;
    const fractionalPart = absolute % 100n;
    const formatted = `${integerPart.toString()}.${fractionalPart.toString().padStart(2, '0')}`;
    return negative ? `-${formatted}` : formatted;
  }
}
