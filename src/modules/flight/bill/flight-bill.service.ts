import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlightBill, FlightBillStatus } from './entities/flight-bill.entity';
import { FlightBillPassenger } from './entities/flight-bill-passenger.entity';
import { CreateFlightBillDto } from './dto/create-flight-bill.dto';
import { UpdateFlightBillDto } from './dto/update-flight-bill.dto';
import { Flight } from '../flight/entities/flight.entity';
import { User } from '../../user/entities/user.entity';
import { VouchersService } from '../../voucher/voucher.service';
import { Voucher } from '../../voucher/entities/voucher.entity';
import { CooperationsService } from '../../cooperation/cooperation.service';
import { UsersService } from '../../user/user.service';

@Injectable()
export class FlightBillsService {
  constructor(
    @InjectRepository(FlightBill)
    private readonly billRepo: Repository<FlightBill>,
    @InjectRepository(FlightBillPassenger)
    private readonly passengerRepo: Repository<FlightBillPassenger>,
    @InjectRepository(Flight)
    private readonly flightRepo: Repository<Flight>,
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
    return `FB${timestamp}${random}`;
  }

  private isRevenueStatus(status: FlightBillStatus): boolean {
    return status === FlightBillStatus.COMPLETED;
  }

  async create(userId: number, dto: CreateFlightBillDto): Promise<FlightBill> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const flight = await this.flightRepo.findOne({
      where: { id: dto.flightId },
    });
    if (!flight) {
      throw new NotFoundException(`Flight ${dto.flightId} not found`);
    }

    if (!dto.passengers?.length) {
      throw new BadRequestException('At least one passenger is required');
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

    const status = dto.status ?? FlightBillStatus.PENDING;

    const bill = this.billRepo.create({
      code: this.generateBillCode(),
      user,
      userId: user.id,
      flight,
      flightId: flight.id,
      cooperationId: flight.cooperationId,
      cabinClass: dto.cabinClass ?? flight.cabinClass,
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
      passengers: dto.passengers.map((passenger) =>
        this.passengerRepo.create({
          passengerName: passenger.passengerName,
          passengerPhone: passenger.passengerPhone,
          passportNumber: passenger.passportNumber,
          seatNumber: passenger.seatNumber,
          cabinClass: passenger.cabinClass,
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
      flightId?: number;
      cooperationId?: number;
      status?: FlightBillStatus;
    } = {},
  ): Promise<FlightBill[]> {
    const qb = this.billRepo
      .createQueryBuilder('bill')
      .leftJoinAndSelect('bill.user', 'user')
      .leftJoinAndSelect('bill.flight', 'flight')
      .leftJoinAndSelect('bill.passengers', 'passengers')
      .leftJoinAndSelect('bill.voucher', 'voucher');

    qb.andWhere('bill.userId = :userId', { userId });
    if (params.flightId) {
      qb.andWhere('bill.flightId = :flightId', { flightId: params.flightId });
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

  async findOne(id: number, userId: number): Promise<FlightBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: {
        user: true,
        flight: true,
        voucher: true,
        passengers: true,
        cooperation: true,
      },
      order: { passengers: { id: 'ASC' } },
    });
    if (!bill) {
      throw new NotFoundException(`Flight bill ${id} not found`);
    }
    if (bill.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this flight bill',
      );
    }
    return bill;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateFlightBillDto,
  ): Promise<FlightBill> {
    const bill = await this.findOne(id, userId);
    const previousStatus = bill.status;

    if (dto.flightId !== undefined && dto.flightId !== bill.flightId) {
      const flight = await this.flightRepo.findOne({
        where: { id: dto.flightId },
      });
      if (!flight) {
        throw new NotFoundException(`Flight ${dto.flightId} not found`);
      }
      bill.flight = flight;
      bill.flightId = flight.id;
      bill.cooperationId = flight.cooperationId;
      if (dto.cabinClass === undefined) {
        bill.cabinClass = flight.cabinClass;
      }
    }

    if (dto.cabinClass !== undefined) {
      bill.cabinClass = dto.cabinClass;
    }

    updateOptionalFields(bill, dto);

    let subtotal = Number(bill.subtotal);
    if (dto.passengers) {
      if (!dto.passengers.length) {
        throw new BadRequestException('At least one passenger is required');
      }
      await this.passengerRepo.delete({ billId: bill.id });
      bill.passengers = dto.passengers.map((passenger) =>
        this.passengerRepo.create({
          passengerName: passenger.passengerName,
          passengerPhone: passenger.passengerPhone,
          passportNumber: passenger.passportNumber,
          seatNumber: passenger.seatNumber,
          cabinClass: passenger.cabinClass,
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
      FlightBillStatus.CANCELLED,
      bill,
      true,
    );
    await this.billRepo.remove(bill);
    return { id, message: 'Flight bill removed' };
  }

  private async applyStatusTransition(
    previousStatus: FlightBillStatus | null,
    nextStatus: FlightBillStatus,
    bill: FlightBill,
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
      (forceCancellation || nextStatus === FlightBillStatus.CANCELLED) &&
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

function updateOptionalFields(
  bill: FlightBill,
  dto: UpdateFlightBillDto,
): void {
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
