import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, ILike } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CooperationStatus } from '../../cooperation/entities/cooperation-enums';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
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
import { CooperationPaymentService } from '../../cooperation/cooperation-payment.service';
import { ServiceType } from '../../payment/entities/booking-transaction.entity';
import { PaymentService } from '../../payment/payment.service';
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
    @InjectRepository(Cooperation)
    private readonly coopRepo: Repository<Cooperation>,
    private readonly vouchersService: VouchersService,
    private readonly cooperationsService: CooperationsService,
    private readonly walletService: WalletService,
    private readonly blockchainService: BlockchainService,
    private readonly cooperationPaymentService: CooperationPaymentService,
    private readonly paymentService: PaymentService,
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
    throw new BadRequestException(
      `Invalid date format: ${dateStr}. Expected ISO 8601 or dd:MM:yyyy HH:mm`,
    );
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
      this.logger.log(
        `Delivery Bill ${bill.id} (PENDING) cancelled due to 30min timeout`,
      );
    }

    // 10 min timeout for CONFIRMED block REMOVED
  }

  private calculateSubtotal(
    distanceKm: number,
    vehicle: DeliveryVehicle,
  ): number {
    const base = Number(vehicle.priceLessThan10Km ?? 0);
    const extra = Number(vehicle.priceMoreThan10Km ?? 0);
    if (distanceKm <= 10) return base;
    return base + (distanceKm - 10) * extra;
  }

  async create(
    userId: number,
    dto: CreateDeliveryBillDto,
  ): Promise<DeliveryBill> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    let vehicle: DeliveryVehicle | undefined = undefined;
    let subtotal = 0;
    const distanceKm = dto.distanceKm || 2; 

    if (dto.vehicleId) {
      const found = await this.vehicleRepo.findOne({
        where: { id: dto.vehicleId },
        relations: ['cooperation'],
      });
      if (!found) throw new NotFoundException('Delivery vehicle not found');
      vehicle = found;
      subtotal = this.calculateSubtotal(distanceKm, vehicle);
    }

    const bill = this.billRepo.create({
      code: this.generateBillCode(),
      user,
      vehicle,
      cooperation: vehicle?.cooperation,
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

    const saved = await this.billRepo.save(bill);
    this.calculateTotal(saved);
    await this.billRepo.save(saved);
    return this.findOne(saved.id, userId);
  }

  async getQuotes(billId: number, userId: number) {
    const bill = await this.findOne(billId, userId);
    const vehicles = await this.vehicleRepo.find({
      relations: ['cooperation'],
    });

    const distance = parseFloat(bill.distanceKm);

    return vehicles.map((v) => {
      const subtotal = this.calculateSubtotal(distance, v);
      return {
        vehicleId: v.id,
        typeName: v.typeName,
        brandName: v.cooperation?.name,
        brandLogo: v.cooperation?.brandLogo,
        price: this.formatMoney(subtotal),
        weightLimit: v.weightLimit,
        sizeLimit: v.sizeLimit,
      };
    });
  }

  async selectVehicle(
    billId: number,
    vehicleId: number,
    userId: number,
  ): Promise<DeliveryBill> {
    const bill = await this.findOne(billId, userId);
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId },
      relations: ['cooperation'],
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const subtotal = this.calculateSubtotal(parseFloat(bill.distanceKm), vehicle);

    bill.vehicle = vehicle;
    bill.cooperation = vehicle.cooperation;
    bill.subtotal = this.formatMoney(subtotal);

    this.calculateTotal(bill);
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

  async update(
    id: number,
    userId: number,
    dto: UpdateDeliveryBillDto,
  ): Promise<DeliveryBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== DeliveryBillStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update bill in ${bill.status} status`,
      );
    }

    assignDefined(bill, {
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      deliveryAddress: dto.deliveryAddress,
      receiveAddress: dto.receiveAddress,
      receiverName: dto.receiverName,
      receiverPhone: dto.receiverPhone,
      notes: dto.notes,
      paymentMethod: dto.paymentMethod,
    });

    if (dto.voucherCode !== undefined) {
      if (!dto.voucherCode) {
        bill.voucher = undefined;
      } else {
        const voucher = await this.vouchersService.findByCode(dto.voucherCode);
        if (!voucher) throw new NotFoundException('Voucher not found');

        this.vouchersService.validateVoucherForBooking(
          voucher,
          parseFloat(bill.subtotal),
        );

        bill.voucher = voucher;
      }
    }

    if (dto.travelPointsUsed !== undefined) {
      const points = Number(dto.travelPointsUsed);
      if (Number.isNaN(points) || points < 0) {
        throw new BadRequestException(
          'travelPointsUsed must be a non-negative number',
        );
      }

      if (bill.user && points > bill.user.travelPoint) {
        throw new BadRequestException(
          `Bạn không đủ điểm (Hiện có: ${bill.user.travelPoint})`,
        );
      }

      bill.travelPointsUsed = Math.floor(points);
    }

    this.calculateTotal(bill);

    // Auto-confirm logic REMOVED. Status stays PENDING until PAID.

    return this.billRepo.save(bill);
  }


  async pay(id: number, userId: number): Promise<any> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== DeliveryBillStatus.PENDING) {
        throw new BadRequestException('Chỉ có thể thanh toán khi đơn hàng đang ở trạng thái PENDING');
    }

    if (!bill.contactName || !bill.receiverName || !bill.paymentMethod) {
        throw new BadRequestException('Vui lòng cập nhật đầy đủ thông tin giao hàng và thanh toán');
    }

    if (bill.paymentMethod === 'momo') {
        const { payUrl, paymentId } = await this.paymentService.createMomoPayment({
            billId: bill.id,
            serviceType: ServiceType.DELIVERY,
            amount: parseFloat(bill.total),
        });
        return { payUrl, paymentId };
    }

    bill.status = DeliveryBillStatus.PAID;
    return this.billRepo.save(bill);
  }

  async complete(id: number, userId: number): Promise<DeliveryBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== DeliveryBillStatus.IN_TRANSIT)
      throw new BadRequestException('Not in transit');

    bill.status = DeliveryBillStatus.COMPLETED;
    const ownerUserId =
      bill.cooperation?.manager?.id ||
      (bill.vehicle?.cooperation as any)?.manager?.id;
    await this.processRefundOrRelease(bill, 'release', ownerUserId);

    return this.billRepo.save(bill);
  }

  async cancel(id: number, userId: number): Promise<DeliveryBill> {
    const bill = await this.findOne(id, userId);
    if (
      [DeliveryBillStatus.COMPLETED, DeliveryBillStatus.CANCELLED].includes(
        bill.status,
      )
    ) {
      throw new BadRequestException('Finished');
    }

    if ([DeliveryBillStatus.IN_TRANSIT].includes(bill.status)) {
      await this.processRefundOrRelease(bill, 'refund');
    }

    bill.status = DeliveryBillStatus.CANCELLED;
    return this.billRepo.save(bill);
  }

  private calculateTotal(bill: DeliveryBill): void {
    let total = parseFloat(bill.subtotal);

    // 1. Voucher
    if (bill.voucher) {
      const discount = this.vouchersService.calculateDiscountAmount(
        bill.voucher,
        total,
      );
      total -= discount;
    }

    // 2. Points (1:1)
    if (bill.travelPointsUsed > 0) {
      total = Math.max(0, total - bill.travelPointsUsed);
    }

    bill.total = this.formatMoney(total);
  }

  private async processRefundOrRelease(
    bill: DeliveryBill,
    action: 'release' | 'refund',
    ownerUserId?: number,
  ) {
    const amount = parseFloat(bill.total);
    if (amount <= 0) return;

    // Direct payment: App doesn't hold money. Award points only on completion.
    if (action === 'release') {
      const points = Math.floor(amount / 100);
      if (points > 0) {
        await this.userRepo.increment(
          { id: bill.user.id },
          'travelPoint',
          points,
        );
      }
      this.logger.log(
        `Awarded ${points} points to user ${bill.user.id} for completed delivery bill ${bill.id}`,
      );
    }
  }

  private generateBillCode(): string {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `DB${timestamp}${random}`;
  }

  async findAll(
    userId: number,
    params: { status?: DeliveryBillStatus } = {},
  ): Promise<DeliveryBill[]> {
    const qb = this.billRepo.createQueryBuilder('bill');
    qb.where('bill.user_id = :userId', { userId });
    if (params.status)
      qb.andWhere('bill.status = :status', { status: params.status });
    return qb
      .leftJoinAndSelect('bill.vehicle', 'vehicle')
      .orderBy('bill.createdAt', 'DESC')
      .getMany();
  }

  // --- SEEDER LOGIC ---
  async seedDelivery() {
    let admin = await this.userRepo.findOne({ where: { id: 1 } });
    const partners = [
      {
        name: 'Giao Hàng Nhanh (GHN)',
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/ghn_logo',
        representativeName: 'GHN Logistics',
        province: 'Hồ Chí Minh',
      },
      {
        name: 'Lalamove',
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/lalamove_logo',
        representativeName: 'Lalamove VN',
        province: 'Hồ Chí Minh',
      },
    ];

    for (const p of partners) {
      let coop = await this.coopRepo.findOne({
        where: { name: ILike(p.name) },
      });
      if (!coop) {
        coop = this.coopRepo.create({
          ...p,
          type: 'delivery',
          status: CooperationStatus.ACTIVE,
          manager: admin || undefined,
          revenue: '0',
          averageRating: '4.6',
          bookingTimes: 0,
        });
        await this.coopRepo.save(coop);
      }

      // Seed Vehicles
      const count = await this.vehicleRepo.count({
        where: { cooperation: { id: coop.id } },
      });
      if (count === 0) {
        await this.vehicleRepo.save([
          this.vehicleRepo.create({
            typeName: 'Xe máy',
            weightLimit: '30kg',
            sizeLimit: '40x40x40',
            priceLessThan10Km: '15000',
            priceMoreThan10Km: '5000',
            cooperation: coop,
          }),
          this.vehicleRepo.create({
            typeName: 'Xe tải nhỏ (500kg)',
            weightLimit: '500kg',
            sizeLimit: '1.5x1x1m',
            priceLessThan10Km: '150000',
            priceMoreThan10Km: '12000',
            cooperation: coop,
          }),
        ]);
      }
    }
    return { message: 'Delivery partners and vehicles seeded successfully' };
  }
}
