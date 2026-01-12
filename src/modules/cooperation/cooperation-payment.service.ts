import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingTransaction, ServiceType, TransactionPaymentStatus } from '../payment/entities/booking-transaction.entity';
import { Cooperation } from './entities/cooperation.entity';
import { CommissionType } from './entities/cooperation-enums';

@Injectable()
export class CooperationPaymentService {
  private readonly logger = new Logger(CooperationPaymentService.name);

  constructor(
    @InjectRepository(BookingTransaction)
    private readonly transactionRepo: Repository<BookingTransaction>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
  ) {}

  async logTransaction(params: {
    cooperationId: number;
    userId?: number;
    serviceType: ServiceType;
    bookingId: string;
    totalAmount: number;
  }) {
    const { cooperationId, userId, serviceType, bookingId, totalAmount } = params;

    const cooperation = await this.cooperationRepo.findOne({ 
      where: { id: cooperationId },
      select: ['id', 'commissionType', 'commissionValue', 'status']
    });

    if (!cooperation) {
      this.logger.error(`Cooperation ${cooperationId} not found for transaction logging`);
      return null;
    }

    let commissionAmount = 0;
    const commValue = parseFloat(cooperation.commissionValue || '0');

    if (cooperation.commissionType === CommissionType.PERCENT) {
      commissionAmount = (totalAmount * commValue) / 100;
    } else {
      commissionAmount = commValue;
    }

    const partnerAmount = Math.max(0, totalAmount - commissionAmount);

    const transaction = this.transactionRepo.create({
      cooperationId,
      userId,
      serviceType,
      bookingId,
      totalAmount: totalAmount.toFixed(2),
      commissionAmount: commissionAmount.toFixed(2),
      partnerAmount: partnerAmount.toFixed(2),
      paymentStatus: TransactionPaymentStatus.PAID,
    });

    this.logger.log(`Logged transaction for coop ${cooperationId}, booking ${bookingId}: total=${totalAmount}, comm=${commissionAmount}`);
    return this.transactionRepo.save(transaction);
  }

  async getTransactionSummary(cooperationId: number) {
    const transactions = await this.transactionRepo.find({
      where: { cooperationId },
    });

    const summary = transactions.reduce(
      (acc, t) => {
        acc.totalAmount += parseFloat(t.totalAmount);
        acc.totalCommission += parseFloat(t.commissionAmount);
        acc.totalPartner += parseFloat(t.partnerAmount);
        acc.count += 1;
        return acc;
      },
      { totalAmount: 0, totalCommission: 0, totalPartner: 0, count: 0 },
    );

    return summary;
  }
}
