import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DeliveryBill,
  DeliveryBillStatus,
} from './entities/delivery-bill.entity';
import { DeliveryVehicle } from '../delivery-vehicle/entities/delivery-vehicle.entity';
import { CreateDeliveryBillDto } from './dto/create-delivery-bill.dto';
import { UpdateDeliveryBillDto } from './dto/update-delivery-bill.dto';
import { User } from '../../user/entities/user.entity';
import { VouchersService } from '../../voucher/voucher.service';
import { Voucher } from '../../voucher/entities/voucher.entity';
import { CooperationsService } from '../../cooperation/cooperation.service';
import { WalletService } from '../../wallet/wallet.service';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { assignDefined } from '../../../common/utils/object.util';
import { parse, isValid } from 'date-fns';

const VND_TO_ETH_RATE = 80_000_000;

@Injectable()
export class DeliveryBillsService {
  private readonly logger = new Logger(DeliveryBillsService.name);

  constructor(
    @InjectRepository(DeliveryBill)
    private readonly billRepo: Repository<DeliveryBill>,
    @InjectRepository(DeliveryVehicle)
    private readonly vehicleRepo: Repository<DeliveryVehicle>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly vouchersService: VouchersService,
    private readonly cooperationsService: CooperationsService,
    private readonly walletService: WalletService,
    private readonly blockchainService: BlockchainService,
  ) {}

  private formatMoney(value: number | string | undefined): string {
    if (value === undefined || value === null) return '0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return (num || 0).toFixed(2);
  }

  private parseCustomDate(dateStr: string): Date {
    let date = parse(dateStr, 'dd:MM:yyyy HH:mm', new Date());
    if (isValid(date)) return date;
    date = new Date(dateStr);
    if (isValid(date)) return date;
    throw new BadRequestException(`Invalid date format: ${dateStr}. Expected ISO 8601 or dd:MM:yyyy HH:mm`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkTimeouts() {
    const now = new Date();
    
    // 30 min timeout for PENDING
    const pendingThreshold = new Date(now.getTime() - 30 * 60 * 1000);
    const pendingBills = await this.billRepo.find({
      where: {
        status: DeliveryBillStatus.PENDING,
        createdAt: LessThan(pendingThreshold),
      },
    });

    for (const bill of pendingBills) {
      bill.status = DeliveryBillStatus.CANCELLED;
      await this.billRepo.save(bill);
      this.logger.log(`Delivery Bill ${bill.id} (PENDING) cancelled due to 30min timeout`);
    }

    // 10 min timeout for CONFIRMED
    const confirmedThreshold = new Date(now.getTime() - 10 * 60 * 1000);
    const confirmedBills = await this.billRepo.find({
      where: {
        status: DeliveryBillStatus.CONFIRMED,
        updatedAt: LessThan(confirmedThreshold),
      },
    });

    for (const bill of confirmedBills) {
      bill.status = DeliveryBillStatus.CANCELLED;
      await this.billRepo.save(bill);
      this.logger.log(`Delivery Bill ${bill.id} (CONFIRMED) cancelled due to 10min timeout`);
    }
  }

  private calculateSubtotal(distanceKm: number, vehicle: DeliveryVehicle): number {
    const base = Number(vehicle.priceLessThan10Km ?? 0);
    const extra = Number(vehicle.priceMoreThan10Km ?? 0);
    if (distanceKm <= 10) return base;
    return base + (distanceKm - 10) * extra;
  }

  async create(userId: number, dto: CreateDeliveryBillDto): Promise<DeliveryBill> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const vehicle = await this.vehicleRepo.findOne({
      where: { id: dto.vehicleId },
      relations: ['cooperation'],
    });
    if (!vehicle) throw new NotFoundException('Delivery vehicle not found');

    const distanceKm = dto.distanceKm || 0;
    const subtotal = this.calculateSubtotal(distanceKm, vehicle);

    const bill = this.billRepo.create({
      code: this.generateBillCode(),
      user,
      vehicle,
      cooperation: vehicle.cooperation,
      deliveryDate: this.parseCustomDate(dto.deliveryDate),
      deliveryAddress: dto.deliveryAddress,
      receiveAddress: dto.receiveAddress,
      description: dto.description,
      receiverName: dto.receiverName,
      receiverPhone: dto.receiverPhone,
      distanceKm: distanceKm.toFixed(2),
      subtotal: this.formatMoney(subtotal),
      status: DeliveryBillStatus.PENDING,
      travelPointsUsed: dto.travelPointsUsed || 0,
    });

    if (dto.voucherCode) {
      const voucher = await this.vouchersService.findByCode(dto.voucherCode);
      if (voucher) bill.voucher = voucher;
    }

    await this.calculateTotal(bill);
    return this.billRepo.save(bill);
  }

  async findOne(id: number, userId: number): Promise<DeliveryBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: ['vehicle', 'user', 'voucher', 'cooperation'],
    });
    if (!bill) throw new NotFoundException(`Delivery bill ${id} not found`);
    if (bill.user?.id !== userId) throw new ForbiddenException('Forbidden');
    return bill;
  }

  async update(id: number, userId: number, dto: UpdateDeliveryBillDto): Promise<DeliveryBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== DeliveryBillStatus.PENDING && bill.status !== DeliveryBillStatus.CONFIRMED) {
      throw new BadRequestException(`Cannot update bill in ${bill.status} status`);
    }

    assignDefined(bill, {
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      deliveryAddress: dto.deliveryAddress,
      receiveAddress: dto.receiveAddress,
      receiverName: dto.receiverName,
      receiverPhone: dto.receiverPhone,
      notes: dto.notes,
    });

    if (dto.voucherCode !== undefined) {
      if (!dto.voucherCode) {
        bill.voucher = undefined;
      } else {
        const voucher = await this.vouchersService.findByCode(dto.voucherCode);
        if (!voucher) throw new NotFoundException('Voucher not found');
        bill.voucher = voucher;
      }
    }

    if (dto.travelPointsUsed !== undefined) {
      bill.travelPointsUsed = dto.travelPointsUsed;
    }

    await this.calculateTotal(bill);
    return this.billRepo.save(bill);
  }

  async confirm(id: number, userId: number, paymentMethod: string): Promise<DeliveryBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== DeliveryBillStatus.PENDING) throw new BadRequestException('Not pending');

    if (!bill.contactName || !bill.contactPhone) {
      throw new BadRequestException('Contact info required');
    }

    bill.status = DeliveryBillStatus.CONFIRMED;
    bill.paymentMethod = paymentMethod;
    return this.billRepo.save(bill);
  }

  async pay(id: number, userId: number): Promise<DeliveryBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== DeliveryBillStatus.CONFIRMED) throw new BadRequestException('Not confirmed');

    if (bill.paymentMethod === 'wallet') {
      const ownerWalletAddress = bill.cooperation?.manager?.bankAccountNumber || (bill.vehicle?.cooperation as any)?.manager?.bankAccountNumber;
      await this.processWalletPayment(bill, ownerWalletAddress);
    }

    bill.status = DeliveryBillStatus.IN_TRANSIT;
    return this.billRepo.save(bill);
  }

  async complete(id: number, userId: number): Promise<DeliveryBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== DeliveryBillStatus.IN_TRANSIT) throw new BadRequestException('Not in transit');

    bill.status = DeliveryBillStatus.COMPLETED;
    const ownerUserId = bill.cooperation?.manager?.id || (bill.vehicle?.cooperation as any)?.manager?.id;
    await this.processRefundOrRelease(bill, 'release', ownerUserId);

    return this.billRepo.save(bill);
  }

  async cancel(id: number, userId: number): Promise<DeliveryBill> {
    const bill = await this.findOne(id, userId);
    if ([DeliveryBillStatus.COMPLETED, DeliveryBillStatus.CANCELLED].includes(bill.status)) {
      throw new BadRequestException('Finished');
    }

    if ([DeliveryBillStatus.IN_TRANSIT].includes(bill.status)) {
       await this.processRefundOrRelease(bill, 'refund');
    }

    bill.status = DeliveryBillStatus.CANCELLED;
    return this.billRepo.save(bill);
  }

  private async calculateTotal(bill: DeliveryBill): Promise<void> {
    let total = parseFloat(bill.subtotal);

    // 1. Voucher (%)
    if (bill.voucher && bill.voucher.value) {
      const val = parseFloat(bill.voucher.value);
      if (bill.voucher.discountType === 'percentage') {
        let discountAmount = total * (val / 100);
        if (bill.voucher.maxDiscountValue) {
          const max = parseFloat(bill.voucher.maxDiscountValue);
          if (discountAmount > max) discountAmount = max;
        }
        total = Math.max(0, total - discountAmount);
      } else {
        total = Math.max(0, total - val);
      }
    }

    // 2. Points (1:1)
    if (bill.travelPointsUsed > 0) {
      total = Math.max(0, total - bill.travelPointsUsed);
    }

    bill.total = this.formatMoney(total);
  }

  private async processWalletPayment(bill: DeliveryBill, ownerWalletAddress?: string) {
    const amount = parseFloat(bill.total);
    if (amount <= 0) return;
    await this.walletService.lockFunds(bill.user.id, amount, `delivery:${bill.id}`);
    if (ownerWalletAddress) {
      const eth = (amount / VND_TO_ETH_RATE).toFixed(8);
      await this.blockchainService.adminDepositForRental(bill.id, ownerWalletAddress, eth);
    }
  }

  private async processRefundOrRelease(bill: DeliveryBill, action: 'release' | 'refund', ownerUserId?: number) {
    const amount = parseFloat(bill.total);
    if (amount <= 0) return;
    await this.walletService.releaseFunds(bill.user.id, amount, `delivery:${bill.id}`, action === 'release' ? ownerUserId : undefined);

    if (action === 'release') {
      await this.blockchainService.adminReleaseFundsForRental(bill.id);
      const points = Math.floor(amount / 100);
      if (points > 0) {
        await this.userRepo.increment({ id: bill.user.id }, 'travelPoint', points);
      }
    } else {
      await this.blockchainService.adminRefundForRental(bill.id);
    }
  }

  private generateBillCode(): string {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `DB${timestamp}${random}`;
  }

  async findAll(userId: number, params: { status?: DeliveryBillStatus } = {}): Promise<DeliveryBill[]> {
    const qb = this.billRepo.createQueryBuilder('bill');
    qb.where('bill.user_id = :userId', { userId });
    if (params.status) qb.andWhere('bill.status = :status', { status: params.status });
    return qb.leftJoinAndSelect('bill.vehicle', 'vehicle')
             .orderBy('bill.createdAt', 'DESC')
             .getMany();
  }
}
