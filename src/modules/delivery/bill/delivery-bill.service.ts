import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { UsersService } from '../../user/user.service';

@Injectable()
export class DeliveryBillsService {
  constructor(
    @InjectRepository(DeliveryBill)
    private readonly billRepo: Repository<DeliveryBill>,
    @InjectRepository(DeliveryVehicle)
    private readonly vehicleRepo: Repository<DeliveryVehicle>,
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

  private formatDistance(value: number | string | undefined): string {
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
    return `DB${timestamp}${random}`;
  }

  private calculateSubtotal(
    distanceKm: number,
    vehicle: DeliveryVehicle,
  ): number {
    const base = Number(vehicle.priceLessThan10Km ?? 0);
    const extra = Number(vehicle.priceMoreThan10Km ?? 0);
    if (distanceKm <= 10) {
      return base;
    }
    const additionalDistance = distanceKm - 10;
    return base + additionalDistance * extra;
  }

  private isRevenueStatus(status: DeliveryBillStatus): boolean {
    return status === DeliveryBillStatus.COMPLETED;
  }

  async create(
    userId: number,
    dto: CreateDeliveryBillDto,
  ): Promise<DeliveryBill> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const vehicle = await this.vehicleRepo.findOne({
      where: { id: dto.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(
        `Delivery vehicle ${dto.vehicleId} not found`,
      );
    }

    const distanceKm = dto.distanceKm ?? 0;
    if (distanceKm < 0) {
      throw new BadRequestException('distanceKm must be positive');
    }
    const subtotal = this.calculateSubtotal(distanceKm, vehicle);

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

    const status = dto.status ?? DeliveryBillStatus.PENDING;

    const bill = this.billRepo.create({
      code: this.generateBillCode(),
      user,
      userId: user.id,
      vehicle,
      vehicleId: vehicle.id,
      cooperationId: vehicle.cooperationId,
      deliveryDate: new Date(dto.deliveryDate),
      deliveryAddress: dto.deliveryAddress,
      receiveAddress: dto.receiveAddress,
      description: dto.description,
      receiverName: dto.receiverName,
      receiverPhone: dto.receiverPhone,
      distanceKm: this.formatDistance(distanceKm),
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
    });

    const saved = await this.billRepo.save(bill);
    const persisted = await this.findOne(saved.id, userId);

    await this.applyStatusTransition(null, status, persisted);

    return persisted;
  }

  async findAll(
    userId: number,
    params: {
      status?: DeliveryBillStatus;
      vehicleId?: number;
      cooperationId?: number;
    } = {},
  ): Promise<DeliveryBill[]> {
    const qb = this.billRepo
      .createQueryBuilder('bill')
      .leftJoinAndSelect('bill.vehicle', 'vehicle')
      .leftJoinAndSelect('bill.user', 'user')
      .leftJoinAndSelect('bill.voucher', 'voucher');

    qb.andWhere('bill.userId = :userId', { userId });

    if (params.vehicleId) {
      qb.andWhere('bill.vehicleId = :vehicleId', {
        vehicleId: params.vehicleId,
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

  async findOne(id: number, userId: number): Promise<DeliveryBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: {
        vehicle: true,
        user: true,
        voucher: true,
        cooperation: true,
      },
    });
    if (!bill) {
      throw new NotFoundException(`Delivery bill ${id} not found`);
    }
    if (bill.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this delivery bill',
      );
    }
    return bill;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateDeliveryBillDto,
  ): Promise<DeliveryBill> {
    const bill = await this.findOne(id, userId);
    const previousStatus = bill.status;

    if (dto.deliveryDate !== undefined) {
      bill.deliveryDate = new Date(dto.deliveryDate);
    }

    if (dto.vehicleId !== undefined && dto.vehicleId !== bill.vehicleId) {
      const vehicle = await this.vehicleRepo.findOne({
        where: { id: dto.vehicleId },
      });
      if (!vehicle) {
        throw new NotFoundException(
          `Delivery vehicle ${dto.vehicleId} not found`,
        );
      }
      bill.vehicle = vehicle;
      bill.vehicleId = vehicle.id;
      bill.cooperationId = vehicle.cooperationId;
    }

    if (dto.deliveryAddress !== undefined) {
      bill.deliveryAddress = dto.deliveryAddress;
    }
    if (dto.receiveAddress !== undefined) {
      bill.receiveAddress = dto.receiveAddress;
    }
    if (dto.description !== undefined) {
      bill.description = dto.description;
    }
    if (dto.receiverName !== undefined) {
      bill.receiverName = dto.receiverName;
    }
    if (dto.receiverPhone !== undefined) {
      bill.receiverPhone = dto.receiverPhone;
    }

    let distanceKm = Number(bill.distanceKm);
    if (dto.distanceKm !== undefined) {
      if (dto.distanceKm < 0) {
        throw new BadRequestException('distanceKm must be positive');
      }
      distanceKm = dto.distanceKm;
      bill.distanceKm = this.formatDistance(distanceKm);
    }

    let subtotal = Number(bill.subtotal);
    if (dto.distanceKm !== undefined || dto.vehicleId !== undefined) {
      const vehicle = await this.vehicleRepo.findOne({
        where: { id: bill.vehicleId },
      });
      if (!vehicle) {
        throw new NotFoundException(
          `Delivery vehicle ${bill.vehicleId} not found`,
        );
      }
      subtotal = this.calculateSubtotal(distanceKm, vehicle);
      bill.subtotal = this.formatMoney(subtotal);
    }

    assignOptional(bill, dto);

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
      DeliveryBillStatus.CANCELLED,
      bill,
      true,
    );
    await this.billRepo.remove(bill);
    return { id, message: 'Delivery bill removed' };
  }

  private async applyStatusTransition(
    previousStatus: DeliveryBillStatus | null,
    nextStatus: DeliveryBillStatus,
    bill: DeliveryBill,
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
      (forceCancellation || nextStatus === DeliveryBillStatus.CANCELLED) &&
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

function assignOptional(bill: DeliveryBill, dto: UpdateDeliveryBillDto): void {
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
