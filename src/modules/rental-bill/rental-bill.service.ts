import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  RentalBill,
  RentalBillStatus,
  RentalBillType,
} from './entities/rental-bill.entity';
import { RentalBillDetail } from './entities/rental-bill-detail.entity';
import { CreateRentalBillDto } from './dto/create-rental-bill.dto';
import { UpdateRentalBillDto } from './dto/update-rental-bill.dto';
import { ManageRentalBillVehicleDto } from './dto/manage-rental-bill-vehicle.dto';
import {
  RentalVehicle,
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from '../rental-vehicle/entities/rental-vehicle.entity';
import { User } from '../user/entities/user.entity';
import { assignDefined } from '../../common/utils/object.util';
import { VouchersService } from '../voucher/voucher.service';
import { Voucher } from '../voucher/entities/voucher.entity';
import { WalletService } from '../wallet/wallet.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { parse, isValid } from 'date-fns';

const VND_TO_ETH_RATE = 80_000_000;

@Injectable()
export class RentalBillsService {
  private readonly logger = new Logger(RentalBillsService.name);

  constructor(
    @InjectRepository(RentalBill)
    private readonly billRepo: Repository<RentalBill>,
    @InjectRepository(RentalBillDetail)
    private readonly detailRepo: Repository<RentalBillDetail>,
    @InjectRepository(RentalVehicle)
    private readonly vehicleRepo: Repository<RentalVehicle>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly vouchersService: VouchersService,
    private readonly walletService: WalletService,
    private readonly blockchainService: BlockchainService,
    private readonly dataSource: DataSource,
  ) {}

  private formatMoney(value: number | string | undefined): string {
    if (value === undefined || value === null) {
      return '0.00';
    }
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return (num || 0).toFixed(2);
  }

  private generateBillCode(): string {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `RB${timestamp}${random}`;
  }

  private parseCustomDate(dateStr: string): Date {
    // Try dd:MM:yyyy HH:mm first
    let date = parse(dateStr, 'dd:MM:yyyy HH:mm', new Date());
    if (isValid(date)) return date;

    // Fallback to ISO
    date = new Date(dateStr);
    if (isValid(date)) return date;

    throw new BadRequestException(`Invalid date format: ${dateStr}. Expected ISO 8601 or dd:MM:yyyy HH:mm`);
  }

  /**
   * Cron job to handle bill timeouts:
   * - PENDING: Cancel after 30 minutes.
   * - CONFIRMED: Cancel after 10 minutes if not PAID.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkTimeouts() {
    const now = new Date();
    
    // 30 min timeout for PENDING
    const pendingThreshold = new Date(now.getTime() - 30 * 60 * 1000);
    const pendingBills = await this.billRepo.find({
      where: {
        status: RentalBillStatus.PENDING,
        createdAt: LessThan(pendingThreshold),
      },
    });

    for (const bill of pendingBills) {
      bill.status = RentalBillStatus.CANCELLED;
      await this.billRepo.save(bill);
      this.logger.log(`Bill ${bill.id} (PENDING) cancelled due to 30min timeout`);
    }

    // 10 min timeout for CONFIRMED
    const confirmedThreshold = new Date(now.getTime() - 10 * 60 * 1000);
    const confirmedBills = await this.billRepo.find({
      where: {
        status: RentalBillStatus.CONFIRMED,
        updatedAt: LessThan(confirmedThreshold),
      },
    });

    for (const bill of confirmedBills) {
      bill.status = RentalBillStatus.CANCELLED;
      await this.billRepo.save(bill);
      this.logger.log(`Bill ${bill.id} (CONFIRMED) cancelled due to 10min timeout`);
    }
  }

  async create(userId: number, dto: CreateRentalBillDto): Promise<RentalBill> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const startDate = dto.startDate;
    const endDate = dto.endDate;

    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be greater than startDate');
    }

    const bill = this.billRepo.create({
      code: this.generateBillCode(),
      userId,
      rentalType: dto.rentalType,
      startDate,
      endDate,
      location: dto.location,
      status: RentalBillStatus.PENDING,
      travelPointsUsed: dto.travelPointsUsed || 0,
    });

    const saved = await this.billRepo.save(bill);

    // Add vehicles
    for (const detailDto of dto.details) {
      await this.addVehicleToBill(saved.id, userId, detailDto);
    }

    return this.findOne(saved.id, userId);
  }

  async findOne(id: number, userId: number): Promise<RentalBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: ['details', 'details.vehicle', 'user', 'voucher'],
    });
    if (!bill) {
      throw new NotFoundException(`Rental bill ${id} not found`);
    }
    if (bill.userId !== userId) {
      throw new ForbiddenException('You do not have access to this rental bill');
    }
    return bill;
  }

  async update(id: number, userId: number, dto: UpdateRentalBillDto): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);

    if (bill.status !== RentalBillStatus.PENDING && bill.status !== RentalBillStatus.CONFIRMED) {
      throw new BadRequestException(`Cannot update bill in ${bill.status} status`);
    }

    assignDefined(bill, {
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      notes: dto.notes,
    });

    if (dto.voucherCode !== undefined) {
      if (!dto.voucherCode) {
        bill.voucher = undefined;
        bill.voucherId = undefined;
      } else {
        const voucher = await this.vouchersService.findByCode(dto.voucherCode);
        if (!voucher) throw new NotFoundException('Voucher not found');
        bill.voucher = voucher;
        bill.voucherId = voucher.id;
      }
    }

    if (dto.travelPointsUsed !== undefined) {
      bill.travelPointsUsed = parseInt(dto.travelPointsUsed.toString(), 10);
    }

    // Recalculate total if something changed
    await this.calculateTotal(bill);
    
    return this.billRepo.save(bill);
  }

  async confirm(id: number, userId: number, paymentMethod: string): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== RentalBillStatus.PENDING) {
      throw new BadRequestException('Only PENDING bills can be confirmed');
    }

    if (!bill.contactName || !bill.contactPhone) {
      throw new BadRequestException('Contact information is required before confirmation');
    }

    bill.status = RentalBillStatus.CONFIRMED;
    bill.paymentMethod = paymentMethod;
    return this.billRepo.save(bill);
  }

  async pay(id: number, userId: number): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== RentalBillStatus.CONFIRMED) {
      throw new BadRequestException('Only CONFIRMED bills can be paid');
    }

    // Process payment based on method
    if (bill.paymentMethod === 'wallet') {
      const vehicles = bill.details.map(d => d.vehicle).filter(v => !!v);
      const ownerWalletAddress = vehicles[0]?.contract?.user?.bankAccountNumber;
      await this.processWalletPayment(bill, ownerWalletAddress);
    } else if (bill.paymentMethod === 'momo') {
      // Mock MoMo direct payment
      this.logger.log(`Processing direct MoMo payment for bill ${bill.id}`);
    }

    bill.status = RentalBillStatus.PAID;
    
    // Set vehicles to UNAVAILABLE
    for (const detail of bill.details) {
      if (detail.vehicle) {
        detail.vehicle.availability = RentalVehicleAvailabilityStatus.UNAVAILABLE;
        await this.vehicleRepo.save(detail.vehicle);
      }
    }

    return this.billRepo.save(bill);
  }

  async complete(id: number, userId: number): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== RentalBillStatus.PAID) {
      throw new BadRequestException('Only PAID bills can be completed');
    }

    bill.status = RentalBillStatus.COMPLETED;
    
    // Process funds release to owner
    const vehicles = bill.details.map(d => d.vehicle).filter(v => !!v);
    const ownerUserId = vehicles[0]?.contract?.user?.id;
    await this.processRefundOrRelease(bill, 'release', ownerUserId);

    // Set vehicles back to AVAILABLE
    for (const detail of bill.details) {
      if (detail.vehicle) {
        detail.vehicle.availability = RentalVehicleAvailabilityStatus.AVAILABLE;
        detail.vehicle.totalRentals += 1;
        await this.vehicleRepo.save(detail.vehicle);
      }
    }

    return this.billRepo.save(bill);
  }

  async cancel(id: number, userId: number): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);
    if ([RentalBillStatus.COMPLETED, RentalBillStatus.CANCELLED].includes(bill.status)) {
      throw new BadRequestException(`Bill is already ${bill.status}`);
    }

    // If already paid/confirmed, handle refunds or vehicle availability
    if (bill.status === RentalBillStatus.PAID) {
      await this.processRefundOrRelease(bill, 'refund');
    }

    if ([RentalBillStatus.PAID, RentalBillStatus.CONFIRMED].includes(bill.status)) {
       for (const detail of bill.details) {
        if (detail.vehicle) {
          detail.vehicle.availability = RentalVehicleAvailabilityStatus.AVAILABLE;
          await this.vehicleRepo.save(detail.vehicle);
        }
      }
    }

    bill.status = RentalBillStatus.CANCELLED;
    return this.billRepo.save(bill);
  }

  async addVehicleToBill(id: number, userId: number, dto: ManageRentalBillVehicleDto): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== RentalBillStatus.PENDING) {
      throw new BadRequestException('Can only add vehicles to PENDING bills');
    }

    const vehicle = await this.vehicleRepo.findOne({
      where: { licensePlate: dto.licensePlate },
      relations: ['contract'],
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.status !== RentalVehicleApprovalStatus.APPROVED || vehicle.availability !== RentalVehicleAvailabilityStatus.AVAILABLE) {
      throw new BadRequestException('Vehicle is not available for rental');
    }

    // Check if same owner
    if (bill.details?.length > 0) {
      const firstDetail = await this.detailRepo.findOne({
        where: { billId: bill.id },
        relations: ['vehicle'],
      });
      if (firstDetail?.vehicle?.contractId !== vehicle.contractId) {
        throw new BadRequestException('All vehicles must belong to the same owner');
      }
    }

    const price = bill.rentalType === RentalBillType.HOURLY ? vehicle.pricePerHour : vehicle.pricePerDay;

    const detail = this.detailRepo.create({
      bill,
      licensePlate: vehicle.licensePlate,
      price: this.formatMoney(price),
    });

    await this.detailRepo.save(detail);
    await this.calculateTotal(bill);
    return this.findOne(id, userId);
  }

  async removeVehicleFromBill(id: number, userId: number, licensePlate: string): Promise<RentalBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== RentalBillStatus.PENDING) {
      throw new BadRequestException('Can only remove vehicles from PENDING bills');
    }

    await this.detailRepo.delete({ billId: id, licensePlate });
    await this.calculateTotal(bill);
    return this.findOne(id, userId);
  }

  private async calculateTotal(bill: RentalBill): Promise<void> {
    const details = await this.detailRepo.find({ where: { billId: bill.id } });
    let total = details.reduce((sum, d) => sum + parseFloat(d.price), 0);

    const duration = bill.endDate.getTime() - bill.startDate.getTime();
    if (bill.rentalType === RentalBillType.DAILY) {
      const days = Math.ceil(duration / (24 * 60 * 60 * 1000));
      total *= days;
    } else {
      const hours = Math.ceil(duration / (60 * 60 * 1000));
      total *= hours;
    }

    // 1. Voucher (%)
    if (bill.voucher && bill.voucher.value) {
      const discountVal = parseFloat(bill.voucher.value);
      if (bill.voucher.discountType === 'percentage') {
        let discountAmount = total * (discountVal / 100);
        if (bill.voucher.maxDiscountValue) {
          const maxDiscount = parseFloat(bill.voucher.maxDiscountValue);
          if (discountAmount > maxDiscount) discountAmount = maxDiscount;
        }
        total = Math.max(0, total - discountAmount);
      } else {
        total = Math.max(0, total - discountVal);
      }
    }

    // 2. TravelPoint (1:1)
    if (bill.travelPointsUsed > 0) {
      total = Math.max(0, total - bill.travelPointsUsed);
    }

    bill.total = this.formatMoney(total);
  }

  private async processWalletPayment(bill: RentalBill, ownerWalletAddress?: string) {
    const totalAmount = parseFloat(bill.total);
    if (totalAmount <= 0) return;

    await this.walletService.lockFunds(bill.userId, totalAmount, `rental:${bill.id}`);

    if (ownerWalletAddress) {
      const amountEth = (totalAmount / VND_TO_ETH_RATE).toFixed(8);
      await this.blockchainService.adminDepositForRental(bill.id, ownerWalletAddress, amountEth);
    }
  }

  private async processRefundOrRelease(bill: RentalBill, action: 'release' | 'refund', ownerUserId?: number) {
    const totalAmount = parseFloat(bill.total);
    if (totalAmount <= 0) return;

    await this.walletService.releaseFunds(bill.userId, totalAmount, `rental:${bill.id}`, action === 'release' ? ownerUserId : undefined);

    if (action === 'release') {
      await this.blockchainService.adminReleaseFundsForRental(bill.id);
      
      // Award points: 1000 VND = 10 points
      const pointsEarned = Math.floor(totalAmount / 100) * 1; // Actually 1000 VND = 10 pts means 100 VND = 1 pt
      // No, 1000 VND = 10 pts is (totalAmount / 1000) * 10 = totalAmount / 100. Correct.
      if (pointsEarned > 0) {
        await this.userRepo.increment({ id: bill.userId }, 'travelPoint', pointsEarned);
      }
    } else {
      await this.blockchainService.adminRefundForRental(bill.id);
    }
  }

  async generatePaymentQR(id: number, userId: number) {
    const bill = await this.findOne(id, userId);
    // Simple mock QR text
    return {
      qrData: `TRAVELINE_PAY_${bill.code}_${bill.total}`,
      amount: bill.total,
      message: 'Vui lòng quét mã để thanh toán',
    };
  }

  async findAll(userId: number, params: { status?: RentalBillStatus } = {}): Promise<RentalBill[]> {
    const qb = this.billRepo.createQueryBuilder('bill');
    qb.where('bill.userId = :userId', { userId });
    if (params.status) qb.andWhere('bill.status = :status', { status: params.status });
    return qb.leftJoinAndSelect('bill.details', 'details')
             .leftJoinAndSelect('details.vehicle', 'vehicle')
             .orderBy('bill.createdAt', 'DESC')
             .getMany();
  }
}
