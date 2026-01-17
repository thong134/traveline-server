import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HotelBill, HotelBillStatus } from './entities/hotel-bill.entity';
import { HotelBillDetail } from './entities/hotel-bill-detail.entity';
import { CreateHotelBillDto } from './dto/create-hotel-bill.dto';
import { UpdateHotelBillDto } from './dto/update-hotel-bill.dto';
import { HotelRoom } from '../room/entities/hotel-room.entity';
import { User } from '../../user/entities/user.entity';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { Voucher } from '../../voucher/entities/voucher.entity';
import { HotelRoomsService } from '../room/hotel-room.service';
import { CooperationsService } from '../../cooperation/cooperation.service';
import { VouchersService } from '../../voucher/voucher.service';
import { assignDefined } from '../../../common/utils/object.util';
import { WalletService } from '../../wallet/wallet.service';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { CooperationPaymentService } from '../../cooperation/cooperation-payment.service';
import { ServiceType } from '../../payment/entities/booking-transaction.entity';
import { PaymentService } from '../../payment/payment.service';
import { parse, isValid } from 'date-fns';

const VND_TO_ETH_RATE = 80_000_000;

interface BillQueryParams {
  cooperationId?: number;
  status?: HotelBillStatus;
  voucherId?: number;
  fromDate?: string;
  toDate?: string;
}

@Injectable()
export class HotelBillsService {
  private readonly logger = new Logger(HotelBillsService.name);

  constructor(
    @InjectRepository(HotelBill)
    private readonly billRepo: Repository<HotelBill>,
    @InjectRepository(HotelBillDetail)
    private readonly detailRepo: Repository<HotelBillDetail>,
    @InjectRepository(HotelRoom)
    private readonly roomRepo: Repository<HotelRoom>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
    private readonly hotelRoomsService: HotelRoomsService,
    private readonly cooperationsService: CooperationsService,
    private readonly vouchersService: VouchersService,
    private readonly walletService: WalletService,
    private readonly blockchainService: BlockchainService,
    private readonly cooperationPaymentService: CooperationPaymentService,
    private readonly paymentService: PaymentService,
    private readonly dataSource: DataSource,
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
        status: HotelBillStatus.PENDING,
        createdAt: LessThan(pendingThreshold),
      },
    });

    for (const bill of pendingBills) {
      bill.status = HotelBillStatus.CANCELLED;
      await this.billRepo.save(bill);
      this.logger.log(
        `Hotel Bill ${bill.id} (PENDING) cancelled due to 30min timeout`,
      );
    }

    // 10 min timeout for CONFIRMED block REMOVED
  }

  async create(userId: number, dto: CreateHotelBillDto): Promise<HotelBill> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const checkInDate = this.parseCustomDate(dto.checkInDate);
    const checkOutDate = this.parseCustomDate(dto.checkOutDate);

    if (checkOutDate <= checkInDate) {
      throw new BadRequestException('checkOutDate must be after checkInDate');
    }

    const diff = checkOutDate.getTime() - checkInDate.getTime();
    const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));

    const roomIds = dto.rooms.map((r) => r.roomId);
    const rooms = await this.roomRepo.find({
      where: { id: In(roomIds) },
      relations: ['cooperation'],
    });

    if (rooms.length !== new Set(roomIds).size) {
      throw new NotFoundException('Some rooms were not found');
    }

    const cooperationId = rooms[0].cooperation.id;
    if (rooms.some((r) => r.cooperation.id !== cooperationId)) {
      throw new BadRequestException(
        'All rooms must belong to the same cooperation',
      );
    }

    const bill = this.billRepo.create({
      code: this.generateBillCode(),
      user,
      cooperation: rooms[0].cooperation,
      checkInDate,
      checkOutDate,
      nights,
      status: HotelBillStatus.PENDING,
      travelPointsUsed: dto.travelPointsUsed || 0,
    });

    const saved = await this.billRepo.save(bill);

    // Create details
    let totalRooms = 0;
    for (const roomDto of dto.rooms) {
      const room = rooms.find((r) => r.id === roomDto.roomId);
      if (!room) continue;
      for (let i = 0; i < roomDto.quantity; i++) {
        const detail = this.detailRepo.create({
          bill: saved,
          room,
          roomName: room.name,
          nights,
          pricePerNight: this.formatMoney(room.price),
          total: this.formatMoney(parseFloat(room.price) * nights),
        });
        await this.detailRepo.save(detail);
        totalRooms++;
      }
    }

    saved.numberOfRooms = totalRooms;
    if (dto.voucherCode) {
      const voucher = await this.vouchersService.findByCode(dto.voucherCode);
      if (voucher) {
        saved.voucher = voucher;
        saved.voucherId = voucher.id;
      }
    }

    this.calculateTotal(saved);
    await this.billRepo.save(saved);

    return this.findOne(saved.id, userId);
  }

  private generateBillCode(): string {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `HB${timestamp}${random}`;
  }

  async findOne(id: number, userId: number): Promise<HotelBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: [
        'details',
        'details.room',
        'user',
        'cooperation',
        'cooperation.manager',
        'voucher',
      ],
    });
    if (!bill) throw new NotFoundException(`Hotel bill ${id} not found`);
    if (bill.user?.id !== userId) throw new ForbiddenException('Forbidden');
    return bill;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateHotelBillDto,
  ): Promise<HotelBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== HotelBillStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update bill in ${bill.status} status`,
      );
    }

    assignDefined(bill, {
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      notes: dto.notes,
      paymentMethod: dto.paymentMethod,
    });

    if (dto.voucherCode !== undefined) {
      if (!dto.voucherCode) {
        bill.voucher = undefined;
        bill.voucherId = undefined;
      } else {
        const voucher = await this.vouchersService.findByCode(dto.voucherCode);
        if (!voucher) throw new NotFoundException('Voucher not found');

        const baseTotal = bill.details.reduce(
          (sum, d) => sum + parseFloat(d.total),
          0,
        );
        this.vouchersService.validateVoucherForBooking(voucher, baseTotal);

        bill.voucher = voucher;
        bill.voucherId = voucher.id;
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
    // We only check if info is complete during PAY.

    return this.billRepo.save(bill);
  }


  async pay(id: number, userId: number): Promise<any> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== HotelBillStatus.PENDING) {
        throw new BadRequestException('Chỉ có thể thanh toán hóa đơn ở trạng thái PENDING');
    }

    // Validation: Ensure bill has necessary info before paying
    if (!bill.contactName || !bill.contactPhone || !bill.paymentMethod) {
        throw new BadRequestException('Vui lòng cập nhật thông tin liên hệ và phương thức thanh toán trước khi thanh toán');
    }

    if (bill.paymentMethod === 'momo') {
        const { payUrl, paymentId } = await this.paymentService.createMomoPayment({
            billId: bill.id,
            serviceType: ServiceType.HOTEL,
            amount: parseFloat(bill.total),
        });
        return { payUrl, paymentId };
    }

    // Fallback or other methods (e.g. dummy/mock)
    bill.status = HotelBillStatus.PAID;

    // The logic below is now centralized in PaymentService.processHotelPayment
    // But for direct 'pay' calls (if any non-momo methods exist), we might still need some of it
    // or we can just call processSuccessfulPayment manually.
    // However, to keep it simple and standardized, we'll assume MoMo is the primary flow.
    
    // For now, let's just mark as PAID if not MoMo (legacy behavior)
    return this.billRepo.save(bill);
  }

  async complete(id: number, userId: number): Promise<HotelBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== HotelBillStatus.PAID)
      throw new BadRequestException('Not paid');

    bill.status = HotelBillStatus.COMPLETED;
    const ownerUserId = bill.cooperation?.manager?.id;
    await this.processRefundOrRelease(bill, 'release', ownerUserId);

    for (const detail of bill.details) {
      detail.room.totalBookings += 1;
      await this.roomRepo.save(detail.room);
    }

    return this.billRepo.save(bill);
  }

  async cancel(id: number, userId: number): Promise<HotelBill> {
    const bill = await this.findOne(id, userId);
    if (
      bill.status !== HotelBillStatus.PENDING &&
      bill.status !== HotelBillStatus.PAID
    ) {
      throw new BadRequestException('Cannot cancel');
    }

    if (bill.status === HotelBillStatus.PAID) {
      await this.processRefundOrRelease(bill, 'refund');
    }

    bill.status = HotelBillStatus.CANCELLED;
    return this.billRepo.save(bill);
  }

  private calculateTotal(bill: HotelBill): void {
    const totalFromDetails = (bill.details || []).reduce(
      (sum, d) => sum + parseFloat(d.total),
      0,
    );
    let finalAmount = totalFromDetails;

    // 1. Voucher
    if (bill.voucher) {
      const discount = this.vouchersService.calculateDiscountAmount(
        bill.voucher,
        finalAmount,
      );
      finalAmount -= discount;
    }

    // 2. Points (1:1)
    if (bill.travelPointsUsed > 0) {
      finalAmount = Math.max(0, finalAmount - bill.travelPointsUsed);
    }

    bill.total = this.formatMoney(finalAmount);
  }

  private async processRefundOrRelease(
    bill: HotelBill,
    action: 'release' | 'refund',
    ownerUserId?: number,
  ) {
    const amount = parseFloat(bill.total);
    if (amount <= 0) return;

    // For Hotels and other non-rental services, the app DOES NOT hold money.
    // We only need to award points on 'release' (completion).
    // No walletService.releaseFunds or blockchain calls needed as money was never held in escrow.

    if (action === 'release') {
      // 1000 VND = 10 pts => amount / 100
      const points = Math.floor(amount / 100);
      if (points > 0) {
        await this.userRepo.increment(
          { id: bill.user.id },
          'travelPoint',
          points,
        );
      }
      this.logger.log(
        `Awarded ${points} points to user ${bill.user.id} for completed hotel bill ${bill.id}`,
      );
    }
  }

  async findAll(
    userId: number,
    params: BillQueryParams = {},
  ): Promise<HotelBill[]> {
    const qb = this.billRepo.createQueryBuilder('bill');
    qb.where('bill.user_id = :userId', { userId });
    if (params.status)
      qb.andWhere('bill.status = :status', { status: params.status });
    if (params.cooperationId)
      qb.andWhere('bill.cooperation_id = :cid', { cid: params.cooperationId });
    return qb
      .leftJoinAndSelect('bill.details', 'details')
      .leftJoinAndSelect('details.room', 'room')
      .leftJoinAndSelect('bill.cooperation', 'cooperation')
      .leftJoinAndSelect('bill.voucher', 'voucher')
      .addSelect('bill.total')
      .orderBy('bill.createdAt', 'DESC')
      .getMany();
  }
}
