import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusBill, BusBillStatus } from './bus-bill.entity';
import { BusBillDetail } from './bus-bill-detail.entity';
import { CreateBusBillDto } from './dto/create-bus-bill.dto';
import { UpdateBusBillDto } from './dto/update-bus-bill.dto';
import { BusType } from './bus-type.entity';
import { User } from '../users/entities/user.entity';
import { VouchersService } from '../vouchers/vouchers.service';
import { Voucher } from '../vouchers/voucher.entity';
import { CooperationsService } from '../cooperations/cooperations.service';

@Injectable()
export class BusBillsService {
  constructor(
    @InjectRepository(BusBill)
    private readonly billRepo: Repository<BusBill>,
    @InjectRepository(BusBillDetail)
    private readonly detailRepo: Repository<BusBillDetail>,
    @InjectRepository(BusType)
    private readonly busTypeRepo: Repository<BusType>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly vouchersService: VouchersService,
    private readonly cooperationsService: CooperationsService,
  ) {}

  private formatMoney(value: number | string | undefined): string {
    if (value === undefined || value === null) {
      return '0.00';
    }
    const num = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(num)) {
      return '0.00';
    }
    return num.toFixed(2);
  }

  private generateBillCode(): string {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `BB${timestamp}${random}`;
  }

  private isRevenueStatus(status: BusBillStatus): boolean {
    return status === BusBillStatus.COMPLETED;
  }

  async create(dto: CreateBusBillDto): Promise<BusBill> {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    const busType = await this.busTypeRepo.findOne({
      where: { id: dto.busTypeId },
    });
    if (!busType) {
      throw new NotFoundException(`Bus type ${dto.busTypeId} not found`);
    }

    if (!dto.seats?.length) {
      throw new BadRequestException('At least one seat must be selected');
    }

    const subtotal = dto.seats.reduce((sum, seat) => sum + seat.total, 0);

    let voucher: Voucher | null = null;
    let voucherDiscount = 0;
    if (dto.voucherCode) {
      voucher = await this.vouchersService.findByCode(dto.voucherCode);
      if (!voucher) {
        throw new NotFoundException(`Voucher ${dto.voucherCode} not found`);
      }
      this.vouchersService.validateVoucherForBooking(voucher, subtotal);
      voucherDiscount = this.vouchersService.calculateDiscountAmount(
        voucher,
        subtotal,
      );
    }

    const travelPointsUsed = dto.travelPointsUsed ?? 0;
    if (travelPointsUsed > 0) {
      if (user.travelPoint < travelPointsUsed) {
        throw new BadRequestException('Not enough travel points');
      }
      user.travelPoint -= travelPointsUsed;
      await this.userRepo.save(user);
    }

    const totalAfterDiscount = Math.max(
      subtotal - voucherDiscount - travelPointsUsed,
      0,
    );
    const finalTotal =
      dto.totalOverride !== undefined ? dto.totalOverride : totalAfterDiscount;
    if (finalTotal < 0) {
      throw new BadRequestException('Total amount cannot be negative');
    }

    const status = dto.status ?? BusBillStatus.PENDING;

    const bill = this.billRepo.create({
      code: this.generateBillCode(),
      user,
      userId: user.id,
      busType,
      busTypeId: busType.id,
      cooperationId: busType.cooperationId,
      pickUpLocation: dto.pickUpLocation,
      pickUpTime: dto.pickUpTime,
      startDate: dto.startDate,
      endDate: dto.endDate,
      returnPickUpLocation: dto.returnPickUpLocation,
      returnPickUpTime: dto.returnPickUpTime,
      returnStartDate: dto.returnStartDate,
      returnEndDate: dto.returnEndDate,
      numberOfTickets: dto.seats.length,
      subtotal: this.formatMoney(subtotal),
      total: this.formatMoney(finalTotal),
      travelPointsUsed,
      travelPointsRefunded: false,
      status,
      statusReason: dto.statusReason,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      voucher: voucher ?? undefined,
      voucherId: voucher?.id,
      details: dto.seats.map((seat) =>
        this.detailRepo.create({
          seatNumber: seat.seatNumber,
          total: this.formatMoney(seat.total),
        }),
      ),
    });

    const saved = await this.billRepo.save(bill);
    const persisted = await this.findOne(saved.id);
    await this.applyStatusTransition(null, status, persisted);
    return persisted;
  }

  async findAll(
    params: {
      userId?: number;
      busTypeId?: number;
      cooperationId?: number;
      status?: BusBillStatus;
    } = {},
  ): Promise<BusBill[]> {
    const qb = this.billRepo
      .createQueryBuilder('bill')
      .leftJoinAndSelect('bill.user', 'user')
      .leftJoinAndSelect('bill.busType', 'busType')
      .leftJoinAndSelect('bill.details', 'details')
      .leftJoinAndSelect('bill.voucher', 'voucher');

    if (params.userId) {
      qb.andWhere('bill.userId = :userId', { userId: params.userId });
    }
    if (params.busTypeId) {
      qb.andWhere('bill.busTypeId = :busTypeId', {
        busTypeId: params.busTypeId,
      });
    }
    if (params.cooperationId) {
      qb.andWhere('bill.cooperationId = :cooperationId', {
        cooperationId: params.cooperationId,
      });
    }
    if (params.status) {
      qb.andWhere('bill.status = :status', { status: params.status });
    }

    return qb.orderBy('bill.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<BusBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: {
        user: true,
        busType: true,
        voucher: true,
        details: true,
        cooperation: true,
      },
      order: { details: { id: 'ASC' } },
    });
    if (!bill) {
      throw new NotFoundException(`Bus bill ${id} not found`);
    }
    return bill;
  }

  async update(id: number, dto: UpdateBusBillDto): Promise<BusBill> {
    const bill = await this.findOne(id);
    const previousStatus = bill.status;

    if (dto.busTypeId !== undefined && dto.busTypeId !== bill.busTypeId) {
      const busType = await this.busTypeRepo.findOne({
        where: { id: dto.busTypeId },
      });
      if (!busType) {
        throw new NotFoundException(`Bus type ${dto.busTypeId} not found`);
      }
      bill.busType = busType;
      bill.busTypeId = busType.id;
      bill.cooperationId = busType.cooperationId;
    }

    assignMutableFields(bill, dto);

    let subtotal = Number(bill.subtotal);
    if (dto.seats) {
      if (!dto.seats.length) {
        throw new BadRequestException('At least one seat is required');
      }
      await this.detailRepo.delete({ billId: bill.id });
      bill.details = dto.seats.map((seat) =>
        this.detailRepo.create({
          seatNumber: seat.seatNumber,
          total: this.formatMoney(seat.total),
        }),
      );
      subtotal = dto.seats.reduce((sum, seat) => sum + seat.total, 0);
      bill.numberOfTickets = dto.seats.length;
      bill.subtotal = this.formatMoney(subtotal);
    }

    let voucher: Voucher | null = bill.voucher ?? null;
    if (dto.voucherCode !== undefined) {
      if (!dto.voucherCode) {
        voucher = null;
        bill.voucher = undefined;
        bill.voucherId = undefined;
      } else {
        voucher = await this.vouchersService.findByCode(dto.voucherCode);
        if (!voucher) {
          throw new NotFoundException(`Voucher ${dto.voucherCode} not found`);
        }
        this.vouchersService.validateVoucherForBooking(voucher, subtotal);
        bill.voucher = voucher;
        bill.voucherId = voucher.id;
      }
    } else if (voucher) {
      this.vouchersService.validateVoucherForBooking(voucher, subtotal);
    }

    let travelPointsUsed = bill.travelPointsUsed;
    if (
      dto.travelPointsUsed !== undefined &&
      dto.travelPointsUsed !== bill.travelPointsUsed
    ) {
      const user = await this.userRepo.findOne({ where: { id: bill.userId } });
      if (!user) {
        throw new NotFoundException(`User ${bill.userId} not found`);
      }
      if (dto.travelPointsUsed > bill.travelPointsUsed) {
        const additional = dto.travelPointsUsed - bill.travelPointsUsed;
        if (user.travelPoint < additional) {
          throw new BadRequestException('Not enough travel points');
        }
        user.travelPoint -= additional;
        bill.travelPointsRefunded = false;
      } else {
        const refund = bill.travelPointsUsed - dto.travelPointsUsed;
        user.travelPoint += refund;
      }
      travelPointsUsed = dto.travelPointsUsed;
      bill.travelPointsUsed = dto.travelPointsUsed;
      await this.userRepo.save(user);
    }

    const voucherDiscount = voucher
      ? this.vouchersService.calculateDiscountAmount(voucher, subtotal)
      : 0;
    const totalAfterDiscount = Math.max(
      subtotal - voucherDiscount - travelPointsUsed,
      0,
    );
    const finalTotal =
      dto.totalOverride !== undefined ? dto.totalOverride : totalAfterDiscount;
    if (finalTotal < 0) {
      throw new BadRequestException('Total amount cannot be negative');
    }
    bill.total = this.formatMoney(finalTotal);

    if (dto.status !== undefined) {
      bill.status = dto.status;
    }
    if (dto.statusReason !== undefined) {
      bill.statusReason = dto.statusReason;
    }

    const saved = await this.billRepo.save(bill);
    const updated = await this.findOne(saved.id);
    await this.applyStatusTransition(previousStatus, updated.status, updated);
    return updated;
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const bill = await this.findOne(id);
    await this.applyStatusTransition(
      bill.status,
      BusBillStatus.CANCELLED,
      bill,
      true,
    );
    await this.billRepo.remove(bill);
    return { id, message: 'Bus bill removed' };
  }

  private async applyStatusTransition(
    previousStatus: BusBillStatus | null,
    nextStatus: BusBillStatus,
    bill: BusBill,
    forceCancellation = false,
  ): Promise<void> {
    const prevRevenue = previousStatus
      ? this.isRevenueStatus(previousStatus)
      : false;
    const nextRevenue = this.isRevenueStatus(nextStatus);

    if (!prevRevenue && nextRevenue) {
      await this.cooperationsService.adjustBookingMetrics(
        bill.cooperationId,
        1,
        Number(bill.total),
      );
      if (bill.voucherId) {
        await this.vouchersService.incrementUsage(bill.voucherId);
      }
      if (bill.travelPointsUsed > 0 && bill.travelPointsRefunded) {
        const user = await this.userRepo.findOne({
          where: { id: bill.userId },
        });
        if (user) {
          user.travelPoint = Math.max(
            0,
            user.travelPoint - bill.travelPointsUsed,
          );
          await this.userRepo.save(user);
        }
        bill.travelPointsRefunded = false;
        await this.billRepo.update(bill.id, { travelPointsRefunded: false });
      }
    }

    if (prevRevenue && !nextRevenue) {
      await this.cooperationsService.adjustBookingMetrics(
        bill.cooperationId,
        -1,
        -Number(bill.total),
      );
    }

    const shouldRefund =
      (forceCancellation || nextStatus === BusBillStatus.CANCELLED) &&
      bill.travelPointsUsed > 0 &&
      !bill.travelPointsRefunded;

    if (shouldRefund) {
      const user = await this.userRepo.findOne({ where: { id: bill.userId } });
      if (user) {
        user.travelPoint += bill.travelPointsUsed;
        await this.userRepo.save(user);
      }
      bill.travelPointsRefunded = true;
      await this.billRepo.update(bill.id, { travelPointsRefunded: true });
    }
  }
}

function assignMutableFields(bill: BusBill, dto: UpdateBusBillDto): void {
  if (dto.pickUpLocation !== undefined) {
    bill.pickUpLocation = dto.pickUpLocation;
  }
  if (dto.pickUpTime !== undefined) {
    bill.pickUpTime = dto.pickUpTime;
  }
  if (dto.returnPickUpLocation !== undefined) {
    bill.returnPickUpLocation = dto.returnPickUpLocation;
  }
  if (dto.returnPickUpTime !== undefined) {
    bill.returnPickUpTime = dto.returnPickUpTime;
  }
  if (dto.startDate !== undefined) {
    bill.startDate = dto.startDate;
  }
  if (dto.endDate !== undefined) {
    bill.endDate = dto.endDate;
  }
  if (dto.returnStartDate !== undefined) {
    bill.returnStartDate = dto.returnStartDate;
  }
  if (dto.returnEndDate !== undefined) {
    bill.returnEndDate = dto.returnEndDate;
  }
  if (dto.contactName !== undefined) {
    bill.contactName = dto.contactName;
  }
  if (dto.contactPhone !== undefined) {
    bill.contactPhone = dto.contactPhone;
  }
  if (dto.contactEmail !== undefined) {
    bill.contactEmail = dto.contactEmail;
  }
  if (dto.paymentMethod !== undefined) {
    bill.paymentMethod = dto.paymentMethod;
  }
  if (dto.notes !== undefined) {
    bill.notes = dto.notes;
  }
  if (dto.statusReason !== undefined) {
    bill.statusReason = dto.statusReason;
  }
}
