import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RestaurantBooking,
  RestaurantBookingStatus,
} from './entities/restaurant-booking.entity';
import { RestaurantTable } from '../table/entities/restaurant-table.entity';
import { User } from '../../user/entities/user.entity';
import { CreateRestaurantBookingDto } from './dto/create-restaurant-booking.dto';
import { UpdateRestaurantBookingDto } from './dto/update-restaurant-booking.dto';
import { CooperationsService } from '../../cooperation/cooperation.service';

@Injectable()
export class RestaurantBookingsService {
  constructor(
    @InjectRepository(RestaurantBooking)
    private readonly bookingRepo: Repository<RestaurantBooking>,
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly cooperationsService: CooperationsService,
  ) {}

  private generateBookingCode(): string {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `RBK${timestamp}${random}`;
  }

  private isRevenueStatus(status: RestaurantBookingStatus): boolean {
    return status === RestaurantBookingStatus.COMPLETED;
  }

  async create(
    userId: number,
    dto: CreateRestaurantBookingDto,
  ): Promise<RestaurantBooking> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const table = await this.tableRepo.findOne({
      where: { id: dto.tableId },
      relations: { cooperation: true },
    });
    if (!table) {
      throw new NotFoundException(`Restaurant table ${dto.tableId} not found`);
    }

    if (
      table.maxPeople &&
      dto.numberOfGuests &&
      dto.numberOfGuests > table.maxPeople
    ) {
      throw new BadRequestException('Number of guests exceeds table capacity');
    }

    const status = dto.status ?? RestaurantBookingStatus.PENDING;

    const booking = this.bookingRepo.create({
      code: this.generateBookingCode(),
      user,
      table,
      cooperation: table.cooperation,
      checkInDate: new Date(dto.checkInDate),
      durationMinutes: dto.durationMinutes,
      numberOfGuests: dto.numberOfGuests ?? 1,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail,
      notes: dto.notes,
      status,
      statusReason: dto.statusReason,
    });

    const saved = await this.bookingRepo.save(booking);
    const persisted = await this.findOne(saved.id, userId);
    await this.applyStatusTransition(null, status, persisted);
    return persisted;
  }

  async findAll(
    userId: number,
    params: {
      tableId?: number;
      cooperationId?: number;
      status?: RestaurantBookingStatus;
    } = {},
  ): Promise<RestaurantBooking[]> {
    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.table', 'table');

    qb.andWhere('booking.user_id = :userId', { userId });
    if (params.tableId) {
      qb.andWhere('booking.table_id = :tableId', { tableId: params.tableId });
    }
    if (params.cooperationId) {
      qb.andWhere('booking.cooperation_id = :cooperationId', {
        cooperationId: params.cooperationId,
      });
    }
    if (params.status) {
      qb.andWhere('booking.status = :status', { status: params.status });
    }

    return qb.orderBy('booking.createdAt', 'DESC').getMany();
  }

  async findOne(id: number, userId: number): Promise<RestaurantBooking> {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: { user: true, table: true, cooperation: true },
    });
    if (!booking) {
      throw new NotFoundException(`Restaurant booking ${id} not found`);
    }
    if (booking.user?.id !== userId) {
      throw new ForbiddenException('You do not have access to this booking');
    }
    return booking;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateRestaurantBookingDto,
  ): Promise<RestaurantBooking> {
    const booking = await this.findOne(id, userId);
    const previousStatus = booking.status;

    if (dto.tableId !== undefined && dto.tableId !== booking.table?.id) {
      const table = await this.tableRepo.findOne({
        where: { id: dto.tableId },
        relations: { cooperation: true },
      });
      if (!table) {
        throw new NotFoundException(
          `Restaurant table ${dto.tableId} not found`,
        );
      }
      booking.table = table;
      booking.cooperation = table.cooperation;
    }

    if (dto.checkInDate !== undefined) {
      booking.checkInDate = new Date(dto.checkInDate);
    }

    if (dto.durationMinutes !== undefined) {
      if (dto.durationMinutes < 15) {
        throw new BadRequestException('durationMinutes must be at least 15');
      }
      booking.durationMinutes = dto.durationMinutes;
    }

    if (dto.numberOfGuests !== undefined) {
      if (dto.numberOfGuests < 1) {
        throw new BadRequestException('numberOfGuests must be positive');
      }
      booking.numberOfGuests = dto.numberOfGuests;
    }

    assignOptionalFields(booking, dto);

    if (dto.status !== undefined) {
      booking.status = dto.status;
    }
    if (dto.statusReason !== undefined) {
      booking.statusReason = dto.statusReason;
    }

    const saved = await this.bookingRepo.save(booking);
    const updated = await this.findOne(saved.id, userId);
    await this.applyStatusTransition(previousStatus, updated.status, updated);
    return updated;
  }

  async remove(
    id: number,
    userId: number,
  ): Promise<{ id: number; message: string }> {
    const booking = await this.findOne(id, userId);
    await this.applyStatusTransition(
      booking.status,
      RestaurantBookingStatus.CANCELLED,
      booking,
    );
    await this.bookingRepo.remove(booking);
    return { id, message: 'Restaurant booking removed' };
  }

  private async applyStatusTransition(
    previousStatus: RestaurantBookingStatus | null,
    nextStatus: RestaurantBookingStatus,
    booking: RestaurantBooking,
  ): Promise<void> {
    const prevRevenue = previousStatus
      ? this.isRevenueStatus(previousStatus)
      : false;
    const nextRevenue = this.isRevenueStatus(nextStatus);

    if (!prevRevenue && nextRevenue) {
      if (booking.cooperation?.id) {
        await this.cooperationsService.adjustBookingMetrics(
          booking.cooperation.id,
          1,
        );
      }
    }

    if (prevRevenue && !nextRevenue) {
      if (booking.cooperation?.id) {
        await this.cooperationsService.adjustBookingMetrics(
          booking.cooperation.id,
          -1,
        );
      }
    }
  }
}

function assignOptionalFields(
  booking: RestaurantBooking,
  dto: UpdateRestaurantBookingDto,
): void {
  if (dto.contactName !== undefined) {
    booking.contactName = dto.contactName;
  }
  if (dto.contactPhone !== undefined) {
    booking.contactPhone = dto.contactPhone;
  }
  if (dto.contactEmail !== undefined) {
    booking.contactEmail = dto.contactEmail;
  }
  if (dto.notes !== undefined) {
    booking.notes = dto.notes;
  }
}
