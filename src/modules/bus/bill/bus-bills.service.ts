import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusBill, BusBillStatus } from './entities/bus-bill.entity';
import { BusBillDetail } from './entities/bus-bill-detail.entity';
import { CreateBusBillDto } from './dto/create-bus-bill.dto';
import { UpdateBusBillDto } from './dto/update-bus-bill.dto';
import { BusType } from '../bus/entities/bus-type.entity';
import { User } from '../../user/entities/user.entity';
import { VouchersService } from '../../voucher/voucher.service';
import { Voucher } from '../../voucher/entities/voucher.entity';
import { CooperationsService } from '../../cooperation/cooperation.service';

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

  async create(userId: number, dto: CreateBusBillDto): Promise<BusBill> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
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
    const persisted = await this.findOne(saved.id, userId);
    await this.applyStatusTransition(null, status, persisted);
    return persisted;
  }

  async findAll(
    userId: number,
    params: {
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

    qb.andWhere('bill.userId = :userId', { userId });
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

  async findOne(id: number, userId: number): Promise<BusBill> {
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
    if (bill.userId !== userId) {
      throw new ForbiddenException('You do not have access to this bus bill');
    }
    return bill;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateBusBillDto,
  ): Promise<BusBill> {
    const bill = await this.findOne(id, userId);
    const previousStatus = bill.status;

    if (dto.status && dto.status !== bill.status) {
      bill.status = dto.status;
      bill.statusReason = dto.statusReason;
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

    if (dto.travelPointsRefunded !== undefined) {
      bill.travelPointsRefunded = dto.travelPointsRefunded;
    }

    const updated = await this.billRepo.save(bill);
    const refreshed = await this.findOne(updated.id, userId);
    await this.applyStatusTransition(previousStatus, bill.status, refreshed);
    return refreshed;
  }

  async remove(
    id: number,
    userId: number,
  ): Promise<{ id: number; message: string }> {
    const bill = await this.findOne(id, userId);
    await this.billRepo.remove(bill);
    return { id, message: 'Bus bill removed' };
  }

  private async applyStatusTransition(
    previousStatus: BusBillStatus | null,
    nextStatus: BusBillStatus,
    bill: BusBill,
  ): Promise<void> {
    if (previousStatus === nextStatus) {
      return;
    }

    if (this.isRevenueStatus(nextStatus)) {
      await this.cooperationsService.adjustBookingMetrics(
        bill.cooperationId,
        1,
        Number(bill.total ?? 0),
      );
    }

    if (
      previousStatus &&
      this.isRevenueStatus(previousStatus) &&
      !this.isRevenueStatus(nextStatus)
    ) {
      await this.cooperationsService.adjustBookingMetrics(
        bill.cooperationId,
        -1,
        -Number(bill.total ?? 0),
      );
    }
  }
}
