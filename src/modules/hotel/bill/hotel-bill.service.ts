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
    throw new BadRequestException(`Invalid date format: ${dateStr}. Expected ISO 8601 or dd:MM:yyyy HH:mm`);
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
      this.logger.log(`Hotel Bill ${bill.id} (PENDING) cancelled due to 30min timeout`);
    }

    // 10 min timeout for CONFIRMED
    const confirmedThreshold = new Date(now.getTime() - 10 * 60 * 1000);
    const confirmedBills = await this.billRepo.find({
      where: {
        status: HotelBillStatus.CONFIRMED,
        updatedAt: LessThan(confirmedThreshold),
      },
    });

    for (const bill of confirmedBills) {
      bill.status = HotelBillStatus.CANCELLED;
      await this.billRepo.save(bill);
      this.logger.log(`Hotel Bill ${bill.id} (CONFIRMED) cancelled due to 10min timeout`);
    }
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

    const roomIds = dto.rooms.map(r => r.roomId);
    const rooms = await this.roomRepo.find({
      where: { id: In(roomIds) },
      relations: ['cooperation'],
    });

    if (rooms.length !== new Set(roomIds).size) {
      throw new NotFoundException('Some rooms were not found');
    }

    const cooperationId = rooms[0].cooperation.id;
    if (rooms.some(r => r.cooperation.id !== cooperationId)) {
      throw new BadRequestException('All rooms must belong to the same cooperation');
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
      const room = rooms.find(r => r.id === roomDto.roomId);
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
    
    await this.calculateTotal(saved.id);
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
      relations: ['details', 'details.room', 'user', 'cooperation', 'voucher'],
    });
    if (!bill) throw new NotFoundException(`Hotel bill ${id} not found`);
    if (bill.user?.id !== userId) throw new ForbiddenException('Forbidden');
    return bill;
  }

  async update(id: number, userId: number, dto: UpdateHotelBillDto): Promise<HotelBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== HotelBillStatus.PENDING && bill.status !== HotelBillStatus.CONFIRMED) {
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
      const points = Number(dto.travelPointsUsed);
      if (Number.isNaN(points) || points < 0) {
        throw new BadRequestException('travelPointsUsed must be a non-negative number');
      }
      bill.travelPointsUsed = Math.floor(points);
    }

    await this.calculateTotal(bill.id);
    return this.billRepo.save(bill);
  }

  async confirm(
    id: number,
    userId: number,
    paymentMethod: string,
  ): Promise<HotelBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== HotelBillStatus.PENDING) throw new BadRequestException('Not pending');

    if (!bill.contactName || !bill.contactPhone) {
      throw new BadRequestException('Contact info required');
    }

    await this.calculateTotal(bill.id);
    bill.status = HotelBillStatus.CONFIRMED;
    bill.paymentMethod = paymentMethod;
    return this.billRepo.save(bill);
  }

  async pay(id: number, userId: number): Promise<HotelBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== HotelBillStatus.CONFIRMED) throw new BadRequestException('Not confirmed');



    bill.status = HotelBillStatus.PAID;
    
    // Ensure room availability (reservation)
    for (const detail of bill.details) {
      await this.hotelRoomsService.ensureRoomAvailability(detail.room, bill.checkInDate, bill.checkOutDate, 1, bill.id);
    }

    return this.billRepo.save(bill);
  }

  async complete(id: number, userId: number): Promise<HotelBill> {
    const bill = await this.findOne(id, userId);
    if (bill.status !== HotelBillStatus.PAID) throw new BadRequestException('Not paid');

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
    if (bill.status !== HotelBillStatus.PENDING && 
        bill.status !== HotelBillStatus.CONFIRMED && 
        bill.status !== HotelBillStatus.PAID) {
      throw new BadRequestException('Cannot cancel');
    }

    if (bill.status === HotelBillStatus.PAID) {
      await this.processRefundOrRelease(bill, 'refund');
    }

    bill.status = HotelBillStatus.CANCELLED;
    return this.billRepo.save(bill);
  }

  private async calculateTotal(billId: number): Promise<void> {
    const bill = await this.billRepo.findOne({
      where: { id: billId },
      relations: ['details', 'voucher'],
    });
    if (!bill) return;

    const totalFromDetails = bill.details.reduce((sum, d) => sum + parseFloat(d.total), 0);
    let finalAmount = totalFromDetails;

    // 1. Voucher (%)
    if (bill.voucher && bill.voucher.value) {
      const val = parseFloat(bill.voucher.value);
      if (bill.voucher.discountType === 'percentage') {
        let discountAmount = finalAmount * (val / 100);
        if (bill.voucher.maxDiscountValue) {
          const max = parseFloat(bill.voucher.maxDiscountValue);
          if (discountAmount > max) discountAmount = max;
        }
        finalAmount = Math.max(0, finalAmount - discountAmount);
      } else {
        finalAmount = Math.max(0, finalAmount - val);
      }
    }

    // 2. Points (1:1)
    if (bill.travelPointsUsed > 0) {
      finalAmount = Math.max(0, finalAmount - bill.travelPointsUsed);
    }

    const formattedTotal = this.formatMoney(finalAmount);
    await this.billRepo.update(billId, { total: formattedTotal });
    bill.total = formattedTotal;
  }



  private async processRefundOrRelease(bill: HotelBill, action: 'release' | 'refund', ownerUserId?: number) {
    const amount = parseFloat(bill.total);
    if (amount <= 0) return;
    await this.walletService.releaseFunds(bill.user.id, amount, `hotel:${bill.id}`, action === 'release' ? ownerUserId : undefined);

    if (action === 'release') {
      await this.blockchainService.adminReleaseFundsForRental(bill.id);
      // 1000 VND = 10 pts => amount / 100
      const points = Math.floor(amount / 100);
      if (points > 0) {
        await this.userRepo.increment({ id: bill.user.id }, 'travelPoint', points);
      }
    } else {
      await this.blockchainService.adminRefundForRental(bill.id);
    }
  }

  async findAll(userId: number, params: BillQueryParams = {}): Promise<HotelBill[]> {
    const qb = this.billRepo.createQueryBuilder('bill');
    qb.where('bill.user_id = :userId', { userId });
    if (params.status) qb.andWhere('bill.status = :status', { status: params.status });
    if (params.cooperationId) qb.andWhere('bill.cooperation_id = :cid', { cid: params.cooperationId });
    return qb.leftJoinAndSelect('bill.details', 'details')
             .leftJoinAndSelect('details.room', 'room')
             .orderBy('bill.createdAt', 'DESC')
             .getMany();
  }
}
