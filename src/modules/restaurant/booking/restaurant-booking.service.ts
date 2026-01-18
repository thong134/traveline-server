import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  RestaurantBooking,
  RestaurantBookingStatus,
} from './entities/restaurant-booking.entity';
import { RestaurantTable } from '../table/entities/restaurant-table.entity';
import { User } from '../../user/entities/user.entity';
import { CreateRestaurantBookingDto } from './dto/create-restaurant-booking.dto';
import { UpdateRestaurantBookingDto } from './dto/update-restaurant-booking.dto';
import { CooperationsService } from '../../cooperation/cooperation.service';
import { assignDefined } from '../../../common/utils/object.util';
import { parse, isValid } from 'date-fns';

@Injectable()
export class RestaurantBookingsService {
  private readonly logger = new Logger(RestaurantBookingsService.name);

  constructor(
    @InjectRepository(RestaurantBooking)
    private readonly bookingRepo: Repository<RestaurantBooking>,
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly cooperationsService: CooperationsService,
  ) {}

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
    const pendingBookings = await this.bookingRepo.find({
      where: {
        status: RestaurantBookingStatus.PENDING,
        createdAt: LessThan(pendingThreshold),
      },
    });

    for (const booking of pendingBookings) {
      booking.status = RestaurantBookingStatus.CANCELLED;
      await this.bookingRepo.save(booking);
      this.logger.log(
        `Restaurant Booking ${booking.id} (PENDING) cancelled due to 30min timeout`,
      );
    }
  }

  async create(
    userId: number,
    dto: CreateRestaurantBookingDto,
  ): Promise<RestaurantBooking> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    if (!dto.tableIds || dto.tableIds.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một bàn');
    }

    const tables = await this.tableRepo.find({
      where: dto.tableIds.map((id) => ({ id })),
      relations: ['cooperation'],
    });

    if (tables.length !== dto.tableIds.length) {
      throw new BadRequestException('Một hoặc nhiều bàn không tồn tại');
    }

    // Kiểm tra xem tất cả các bàn có thuộc cùng một nhà hàng (cooperation) không
    const cooperationIds = new Set(tables.map((t) => t.cooperation?.id));
    if (cooperationIds.size > 1) {
      throw new BadRequestException('Tất cả các bàn phải thuộc cùng một nhà hàng');
    }

    const cooperation = tables[0].cooperation;

    // Kiểm tra tổng sức chứa nếu cần
    const totalCapacity = tables.reduce((sum, t) => sum + (t.maxPeople || 0), 0);
    if (dto.numberOfGuests && dto.numberOfGuests > totalCapacity) {
      throw new BadRequestException(
        `Số lượng khách (${dto.numberOfGuests}) vượt quá tổng sức chứa của các bàn (${totalCapacity})`,
      );
    }

    const booking = this.bookingRepo.create({
      code: this.generateBookingCode(),
      user,
      tables,
      cooperation,
      checkInDate: this.parseCustomDate(dto.checkInDate),
      durationMinutes: dto.durationMinutes,
      numberOfGuests: dto.numberOfGuests ?? 1,
      notes: dto.notes,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      status: RestaurantBookingStatus.CONFIRMED,
    });

    return this.bookingRepo.save(booking);
  }

  private generateBookingCode(): string {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `RBK${timestamp}${random}`;
  }

  async findOne(id: number, userId: number): Promise<RestaurantBooking> {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['user', 'tables', 'cooperation'],
    });
    if (!booking)
      throw new NotFoundException(`Restaurant booking ${id} not found`);
    if (booking.user?.id !== userId) throw new ForbiddenException('Forbidden');
    return booking;
  }

  async cancel(id: number, userId: number): Promise<RestaurantBooking> {
    const booking = await this.findOne(id, userId);
    if (
      [
        RestaurantBookingStatus.COMPLETED,
        RestaurantBookingStatus.CANCELLED,
      ].includes(booking.status)
    ) {
      throw new BadRequestException('Đặt bàn đã hoàn thành hoặc đã hủy');
    }
    booking.status = RestaurantBookingStatus.CANCELLED;
    return this.bookingRepo.save(booking);
  }

  async findAll(
    userId: number,
    params: { status?: RestaurantBookingStatus } = {},
  ): Promise<RestaurantBooking[]> {
    const qb = this.bookingRepo.createQueryBuilder('booking');
    qb.where('booking.user_id = :userId', { userId });
    if (params.status)
      qb.andWhere('booking.status = :status', { status: params.status });
    return qb
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.tables', 'tables')
      .orderBy('booking.createdAt', 'DESC')
      .getMany();
  }
}
