import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
import { HotelBillRoomDto } from './dto/hotel-bill-room.dto';
import { assignDefined } from '../../../common/utils/object.util';

interface BillQueryParams {
  cooperationId?: number;
  status?: HotelBillStatus;
  voucherId?: number;
  fromDate?: string;
  toDate?: string;
}

interface RoomBookingContext {
  room: HotelRoom;
  quantity: number;
  pricePerNight: number;
  lineTotal: number;
}

@Injectable()
export class HotelBillsService {
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
  ) {}

  private formatMoney(value: number | string): string {
    const numeric = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(numeric)) {
      return '0.00';
    }
    return numeric.toFixed(2);
  }

  private ensureValidDateRange(checkIn: Date, checkOut: Date): void {
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid check-in or check-out date');
    }
    if (checkOut <= checkIn) {
      throw new BadRequestException('checkOutDate must be after checkInDate');
    }
  }

  private calculateNights(checkIn: Date, checkOut: Date): number {
    const diff = checkOut.getTime() - checkIn.getTime();
    const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  }

  private isRevenueStatus(status: HotelBillStatus): boolean {
    return (
      status === HotelBillStatus.PAID || status === HotelBillStatus.COMPLETED
    );
  }

  async create(userId: number, dto: CreateHotelBillDto): Promise<HotelBill> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const checkInDate = new Date(dto.checkInDate);
    const checkOutDate = new Date(dto.checkOutDate);
    this.ensureValidDateRange(checkInDate, checkOutDate);
    const nights = this.calculateNights(checkInDate, checkOutDate);

    const roomIds = dto.rooms.map((item) => item.roomId);
    const rooms = await this.roomRepo.find({
      where: { id: In(roomIds) },
      relations: { cooperation: true },
    });
    if (rooms.length !== roomIds.length) {
      const foundIds = new Set(rooms.map((room) => room.id));
      const missing = roomIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Rooms not found: ${missing.join(', ')}`);
    }

    const roomsById = new Map(rooms.map((room) => [room.id, room] as const));
    const cooperationId = rooms[0].cooperationId;

    if (rooms.some((room) => room.cooperationId !== cooperationId)) {
      throw new BadRequestException(
        'All rooms in a booking must belong to the same cooperation',
      );
    }

    const cooperation = await this.cooperationRepo.findOne({
      where: { id: cooperationId },
    });
    if (!cooperation) {
      throw new NotFoundException(`Cooperation ${cooperationId} not found`);
    }

    if (cooperation.type !== 'hotel') {
      throw new BadRequestException(
        'Selected cooperation does not allow hotel bookings',
      );
    }

    const contexts = await this.buildRoomContexts(
      dto.rooms,
      roomsById,
      checkInDate,
      checkOutDate,
      nights,
    );

    const subtotal = contexts.reduce((sum, ctx) => sum + ctx.lineTotal, 0);
    const totalRooms = contexts.reduce((sum, ctx) => sum + ctx.quantity, 0);

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

    const status = dto.status ?? HotelBillStatus.PENDING;

    const bill = new HotelBill();
    bill.code = this.generateBillCode();
    bill.user = user;
    bill.userId = user.id;
    bill.cooperation = cooperation;
    bill.cooperationId = cooperation.id;
    bill.checkInDate = checkInDate;
    bill.checkOutDate = checkOutDate;
    bill.numberOfRooms = totalRooms;
    bill.nights = nights;
    bill.total = this.formatMoney(finalTotal);
    bill.travelPointsUsed = travelPointsUsed;
    bill.travelPointsRefunded = false;
    bill.status = status;
    bill.statusReason = dto.statusReason;
    bill.paymentMethod = dto.paymentMethod;
    bill.contactName = dto.contactName;
    bill.contactPhone = dto.contactPhone;
    bill.contactEmail = dto.contactEmail;
    bill.notes = dto.notes;
    bill.details = contexts.map((ctx) =>
      this.buildDetail({
        bill,
        roomId: ctx.room.id,
        roomName: ctx.room.name,
        quantity: ctx.quantity,
        nights,
        pricePerNight: this.formatMoney(ctx.pricePerNight),
        total: this.formatMoney(ctx.lineTotal),
      }),
    );

    const saved = await this.billRepo.save(bill);
    const persisted = await this.findOne(saved.id, userId);

    await this.applyStatusTransition(null, status, persisted, contexts);

    return persisted;
  }

  private generateBillCode(): string {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `HB${timestamp}${random}`;
  }

  async findAll(
    userId: number,
    params: BillQueryParams = {},
  ): Promise<HotelBill[]> {
    const qb = this.billRepo
      .createQueryBuilder('bill')
      .leftJoinAndSelect('bill.details', 'details')
      .leftJoinAndSelect('bill.user', 'user')
      .leftJoinAndSelect('bill.cooperation', 'cooperation')
      .leftJoinAndSelect('bill.voucher', 'voucher')
      .leftJoinAndSelect('details.room', 'room');

    qb.andWhere('bill.userId = :userId', { userId });

    if (params.cooperationId) {
      qb.andWhere('bill.cooperationId = :cooperationId', {
        cooperationId: params.cooperationId,
      });
    }

    if (params.status) {
      qb.andWhere('bill.status = :status', { status: params.status });
    }

    if (params.voucherId) {
      qb.andWhere('bill.voucherId = :voucherId', {
        voucherId: params.voucherId,
      });
    }

    if (params.fromDate) {
      qb.andWhere('bill.checkInDate >= :fromDate', {
        fromDate: params.fromDate,
      });
    }

    if (params.toDate) {
      qb.andWhere('bill.checkOutDate <= :toDate', {
        toDate: params.toDate,
      });
    }

    return qb
      .orderBy('bill.createdAt', 'DESC')
      .addOrderBy('details.id', 'ASC')
      .getMany();
  }

  async findOne(id: number, userId: number): Promise<HotelBill> {
    const bill = await this.billRepo.findOne({
      where: { id },
      relations: {
        details: true,
        user: true,
        cooperation: true,
        voucher: true,
      },
      order: { details: { id: 'ASC' } },
    });
    if (!bill) {
      throw new NotFoundException(`Hotel bill ${id} not found`);
    }
    if (bill.userId !== userId) {
      throw new ForbiddenException('You do not have access to this hotel bill');
    }
    return bill;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateHotelBillDto,
  ): Promise<HotelBill> {
    const bill = await this.findOne(id, userId);
    const previousStatus = bill.status;

    if (dto.checkInDate || dto.checkOutDate) {
      const newCheckIn = dto.checkInDate
        ? new Date(dto.checkInDate)
        : bill.checkInDate;
      const newCheckOut = dto.checkOutDate
        ? new Date(dto.checkOutDate)
        : bill.checkOutDate;
      this.ensureValidDateRange(newCheckIn, newCheckOut);
      bill.checkInDate = newCheckIn;
      bill.checkOutDate = newCheckOut;
      bill.nights = this.calculateNights(newCheckIn, newCheckOut);
    }

    let contexts: RoomBookingContext[] | null = null;
    if (dto.rooms) {
      const roomIds = dto.rooms.map((item) => item.roomId);
      const rooms = await this.roomRepo.find({
        where: { id: In(roomIds) },
        relations: { cooperation: true },
      });
      if (rooms.length !== roomIds.length) {
        const existingIds = new Set(rooms.map((room) => room.id));
        const missing = roomIds.filter((val) => !existingIds.has(val));
        throw new NotFoundException(`Rooms not found: ${missing.join(', ')}`);
      }
      if (rooms.some((room) => room.cooperationId !== bill.cooperationId)) {
        throw new BadRequestException(
          'All rooms must belong to the same cooperation',
        );
      }
      const roomsById = new Map(rooms.map((room) => [room.id, room] as const));
      contexts = await this.buildRoomContexts(
        dto.rooms,
        roomsById,
        bill.checkInDate,
        bill.checkOutDate,
        bill.nights,
        bill.id,
      );
      bill.numberOfRooms = contexts.reduce((sum, ctx) => sum + ctx.quantity, 0);
      let subtotal = contexts.reduce((sum, ctx) => sum + ctx.lineTotal, 0);
      if (bill.voucherId) {
        const voucher =
          bill.voucher ??
          (await this.voucherRepo.findOne({ where: { id: bill.voucherId } }));
        if (voucher) {
          this.vouchersService.validateVoucherForBooking(voucher, subtotal);
          const discount = this.vouchersService.calculateDiscountAmount(
            voucher,
            subtotal,
          );
          subtotal -= discount;
        }
      }
      subtotal -= bill.travelPointsUsed;
      if (subtotal < 0) {
        subtotal = 0;
      }
      bill.total = this.formatMoney(subtotal);
      await this.detailRepo.delete({ billId: bill.id });
      bill.details = contexts.map((ctx: RoomBookingContext) =>
        this.buildDetail({
          bill,
          billId: bill.id,
          roomId: ctx.room.id,
          roomName: ctx.room.name,
          quantity: ctx.quantity,
          nights: bill.nights,
          pricePerNight: this.formatMoney(ctx.pricePerNight),
          total: this.formatMoney(ctx.lineTotal),
        }),
      );
    }

    assignDefined(bill, {
      paymentMethod: dto.paymentMethod,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail,
      notes: dto.notes,
      statusReason: dto.statusReason,
    });

    if (dto.voucherCode !== undefined) {
      if (!dto.voucherCode) {
        bill.voucher = undefined;
        bill.voucherId = undefined;
      } else {
        const voucher = await this.vouchersService.findByCode(dto.voucherCode);
        if (!voucher) {
          throw new NotFoundException(`Voucher ${dto.voucherCode} not found`);
        }
        this.vouchersService.validateVoucherForBooking(
          voucher,
          Number(bill.total),
        );
        bill.voucher = voucher;
        bill.voucherId = voucher.id;
      }
    }

    if (
      dto.travelPointsUsed !== undefined &&
      dto.travelPointsUsed !== bill.travelPointsUsed
    ) {
      const user = await this.userRepo.findOne({ where: { id: bill.userId } });
      if (!user) {
        throw new NotFoundException(`User ${bill.userId} not found`);
      }

      if (dto.travelPointsUsed > bill.travelPointsUsed) {
        const additionalPoints = dto.travelPointsUsed - bill.travelPointsUsed;
        if (user.travelPoint < additionalPoints) {
          throw new BadRequestException('Not enough travel points');
        }
        user.travelPoint -= additionalPoints;
      } else {
        const refundPoints = bill.travelPointsUsed - dto.travelPointsUsed;
        user.travelPoint += refundPoints;
      }
      bill.travelPointsUsed = dto.travelPointsUsed;
      bill.travelPointsRefunded = false;
      await this.userRepo.save(user);
    }

    if (dto.totalOverride !== undefined) {
      bill.total = this.formatMoney(dto.totalOverride);
    }

    if (dto.status) {
      bill.status = dto.status;
    }

    const saved = await this.billRepo.save(bill);

    const updated = await this.findOne(saved.id, userId);
    const appliedContexts =
      contexts ??
      updated.details.map((detail) => {
        const room = roomStub(detail.roomId);
        return {
          room,
          quantity: detail.quantity,
          pricePerNight: Number(detail.pricePerNight),
          lineTotal: Number(detail.total),
        };
      });

    await this.applyStatusTransition(
      previousStatus,
      updated.status,
      updated,
      appliedContexts,
      updated.voucher ?? undefined,
    );

    return updated;
  }

  async remove(
    id: number,
    userId: number,
  ): Promise<{ id: number; message: string }> {
    const bill = await this.findOne(id, userId);
    await this.applyStatusTransition(
      bill.status,
      HotelBillStatus.CANCELLED,
      bill,
      bill.details.map((detail) => ({
        room: roomStub(detail.roomId),
        quantity: detail.quantity,
        pricePerNight: Number(detail.pricePerNight),
        lineTotal: Number(detail.total),
      })),
      bill.voucher ?? undefined,
      true,
    );
    await this.billRepo.remove(bill);
    return { id, message: 'Hotel bill removed' };
  }

  private buildDetail(input: {
    bill: HotelBill;
    roomId: number;
    roomName: string;
    quantity: number;
    nights: number;
    pricePerNight: string;
    total: string;
    billId?: number;
  }): HotelBillDetail {
    const detail = new HotelBillDetail();
    detail.bill = input.bill;
    if (input.billId !== undefined) {
      detail.billId = input.billId;
    }
    detail.roomId = input.roomId;
    detail.roomName = input.roomName;
    detail.quantity = input.quantity;
    detail.nights = input.nights;
    detail.pricePerNight = input.pricePerNight;
    detail.total = input.total;
    return detail;
  }

  private async buildRoomContexts(
    inputs: HotelBillRoomDto[],
    roomsById: Map<number, HotelRoom>,
    checkIn: Date,
    checkOut: Date,
    nights: number,
    excludeBillId?: number,
  ): Promise<RoomBookingContext[]> {
    const contexts: RoomBookingContext[] = [];
    for (const input of inputs) {
      const room = roomsById.get(input.roomId);
      if (!room) {
        throw new NotFoundException(`Room ${input.roomId} not found`);
      }
      await this.hotelRoomsService.ensureRoomAvailability(
        room,
        checkIn,
        checkOut,
        input.quantity,
        excludeBillId,
      );
      const pricePerNight = Number(room.price) || 0;
      const lineTotal = pricePerNight * nights * input.quantity;
      contexts.push({
        room,
        quantity: input.quantity,
        pricePerNight,
        lineTotal,
      });
    }
    return contexts;
  }

  private async applyStatusTransition(
    previousStatus: HotelBillStatus | null,
    nextStatus: HotelBillStatus,
    bill: HotelBill,
    contexts: RoomBookingContext[],
    voucher?: Voucher,
    removeVoucherUsage = false,
  ): Promise<void> {
    const prevRevenue = previousStatus
      ? this.isRevenueStatus(previousStatus)
      : false;
    const nextRevenue = this.isRevenueStatus(nextStatus);

    if (!prevRevenue && nextRevenue) {
      await this.cooperationsService.adjustBookingMetrics(
        bill.cooperationId,
        1,
      );
      await this.hotelRoomsService.reserveRooms(contexts);
      if (voucher) {
        await this.vouchersService.incrementUsage(voucher.id);
      }
    }

    if (prevRevenue && !nextRevenue) {
      await this.cooperationsService.adjustBookingMetrics(
        bill.cooperationId,
        -1,
      );
      await this.hotelRoomsService.releaseRooms(contexts);
      if (voucher) {
        await this.vouchersService.decrementUsage(
          voucher.id,
          removeVoucherUsage,
        );
      }
    }
  }
}

function roomStub(roomId: number): HotelRoom {
  const stub = new HotelRoom();
  stub.id = roomId;
  return stub;
}
