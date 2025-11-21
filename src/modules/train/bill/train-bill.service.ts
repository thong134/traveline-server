import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainBill, TrainBillStatus } from './entities/train-bill.entity';
import { TrainBillDetail } from './entities/train-bill-detail.entity';
import { CreateTrainBillDto } from './dto/create-train-bill.dto';
import { UpdateTrainBillDto } from './dto/update-train-bill.dto';
import { TrainRoute } from '../train/entities/train-route.entity';
import { User } from '../../user/entities/user.entity';
import { VouchersService } from '../../voucher/voucher.service';
import { Voucher } from '../../voucher/entities/voucher.entity';
import { CooperationsService } from '../../cooperation/cooperation.service';
import { UsersService } from '../../user/user.service';

@Injectable()
export class TrainBillsService {
  constructor(
    @InjectRepository(TrainBill)
    private readonly billRepo: Repository<TrainBill>,
    @InjectRepository(TrainBillDetail)
    private readonly detailRepo: Repository<TrainBillDetail>,
    @InjectRepository(TrainRoute)
    private readonly routeRepo: Repository<TrainRoute>,
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
    return `TB${timestamp}${random}`;
  }

  private isRevenueStatus(status: TrainBillStatus): boolean {
    return status === TrainBillStatus.COMPLETED;
  }

  async create(userId: number, dto: CreateTrainBillDto): Promise<TrainBill> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const route = await this.routeRepo.findOne({ where: { id: dto.routeId } });
    if (!route) {
      throw new NotFoundException(`Train route ${dto.routeId} not found`);
    }

    if (!dto.passengers?.length) {
      throw new BadRequestException('At least one passenger is required');
    }

    const travelDate = new Date(dto.travelDate);
    if (Number.isNaN(travelDate.getTime())) {
      throw new BadRequestException('travelDate is invalid');
    }

    const subtotal = dto.passengers.reduce((sum, passenger) => {
      return sum + passenger.total;
    }, 0);

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

    const status = dto.status ?? TrainBillStatus.PENDING;

    const bill = this.billRepo.create({
      code: this.generateBillCode(),
      user,
      userId: user.id,
      route,
      routeId: route.id,
      cooperationId: route.cooperationId,
      travelDate,
      carriage: dto.carriage,
      numberOfTickets: dto.passengers.length,
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
      details: dto.passengers.map((passenger) =>
        this.detailRepo.create({
          passengerName: passenger.passengerName,
          passengerPhone: passenger.passengerPhone,
          seatNumber: passenger.seatNumber,
          seatClass: passenger.seatClass,
          total: this.formatMoney(passenger.total),
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
      routeId?: number;
      cooperationId?: number;
      status?: TrainBillStatus;
    } = {},
  ): Promise<TrainBill[]> {
    const qb = this.billRepo
      .createQueryBuilder('bill')
      .leftJoinAndSelect('bill.user', 'user')
      .leftJoinAndSelect('bill.route', 'route')
      .leftJoinAndSelect('bill.details', 'details')
      .leftJoinAndSelect('bill.voucher', 'voucher');

    qb.andWhere('bill.userId = :userId', { userId });
    if (params.routeId) {
      qb.andWhere('bill.routeId = :routeId', { routeId: params.routeId });
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

  async findOne(id: number, userId: number): Promise<TrainBill> {
    const bill = await this.billRepo.findOne({
      where: { id, userId },
      relations: {
        user: true,
        route: true,
        voucher: true,
        details: true,
        cooperation: true,
      },
      order: { details: { id: 'ASC' } },
    });
    if (!bill) {
      throw new NotFoundException(`Train bill ${id} not found`);
    }
    return bill;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateTrainBillDto,
  ): Promise<TrainBill> {
    const bill = await this.findOne(id, userId);
    const previousStatus = bill.status;

    if (dto.routeId !== undefined && dto.routeId !== bill.routeId) {
      const route = await this.routeRepo.findOne({
        where: { id: dto.routeId },
      });
      if (!route) {
        throw new NotFoundException(`Train route ${dto.routeId} not found`);
      }
      bill.route = route;
      bill.routeId = route.id;
      bill.cooperationId = route.cooperationId;
    }

    if (dto.travelDate !== undefined) {
      const travelDate = new Date(dto.travelDate);
      if (Number.isNaN(travelDate.getTime())) {
        throw new BadRequestException('travelDate is invalid');
      }
      bill.travelDate = travelDate;
    }

    if (dto.carriage !== undefined) {
      bill.carriage = dto.carriage;
    }

    updateOptionalFields(bill, dto);

    let subtotal = Number(bill.subtotal);
    if (dto.passengers) {
      if (!dto.passengers.length) {
        throw new BadRequestException('At least one passenger is required');
      }
      await this.detailRepo.delete({ billId: bill.id });
      bill.details = dto.passengers.map((passenger) =>
        this.detailRepo.create({
          passengerName: passenger.passengerName,
          passengerPhone: passenger.passengerPhone,
          seatNumber: passenger.seatNumber,
          seatClass: passenger.seatClass,
          total: this.formatMoney(passenger.total),
        }),
      );
      subtotal = dto.passengers.reduce((sum, passenger) => {
        return sum + passenger.total;
      }, 0);
      bill.numberOfTickets = dto.passengers.length;
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
        user.travelExp += refund;
        user.userTier = UsersService.resolveTier(user.travelExp);
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
    const updated = await this.findOne(saved.id, userId);
    await this.applyStatusTransition(previousStatus, updated.status, updated);
    return updated;
  }

  async remove(
    id: number,
    userId: number,
  ): Promise<{ id: number; message: string }> {
    const bill = await this.findOne(id, userId);
    await this.applyStatusTransition(
      bill.status,
      TrainBillStatus.CANCELLED,
      bill,
      true,
    );
    await this.billRepo.remove(bill);
    return { id, message: 'Train bill removed' };
  }

  private async applyStatusTransition(
    previousStatus: TrainBillStatus | null,
    nextStatus: TrainBillStatus,
    bill: TrainBill,
    forceCancellation = false,
  ): Promise<void> {
    const prevRevenue = previousStatus
      ? this.isRevenueStatus(previousStatus)
      : false;
    const nextRevenue = this.isRevenueStatus(nextStatus);

    if (!prevRevenue && nextRevenue) {
      await this.cooperationsService.adjustBookingMetrics(
        bill.cooperationId,
        bill.numberOfTickets,
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
        -bill.numberOfTickets,
        -Number(bill.total),
      );
    }

    const shouldRefund =
      (forceCancellation || nextStatus === TrainBillStatus.CANCELLED) &&
      bill.travelPointsUsed > 0 &&
      !bill.travelPointsRefunded;

    if (shouldRefund) {
      const user = await this.userRepo.findOne({ where: { id: bill.userId } });
      if (user) {
        user.travelPoint += bill.travelPointsUsed;
        user.travelExp += bill.travelPointsUsed;
        user.userTier = UsersService.resolveTier(user.travelExp);
        await this.userRepo.save(user);
      }
      bill.travelPointsRefunded = true;
      await this.billRepo.update(bill.id, { travelPointsRefunded: true });
    }
  }
}

function updateOptionalFields(bill: TrainBill, dto: UpdateTrainBillDto): void {
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
}
