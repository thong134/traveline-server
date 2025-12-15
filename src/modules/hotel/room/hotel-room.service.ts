import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotelRoom } from './entities/hotel-room.entity';
import { CreateHotelRoomDto } from './dto/create-hotel-room.dto';
import { UpdateHotelRoomDto } from './dto/update-hotel-room.dto';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { HotelBillDetail } from '../bill/entities/hotel-bill-detail.entity';
import { HotelBill, HotelBillStatus } from '../bill/entities/hotel-bill.entity';
import { assignDefined } from '../../../common/utils/object.util';

interface RoomQueryOptions {
  cooperationId?: number;
  city?: string;
  province?: string;
  maxPeople?: number;
  numberOfBeds?: number;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  checkInDate?: string;
  checkOutDate?: string;
  quantity?: number;
}

@Injectable()
export class HotelRoomsService {
  constructor(
    @InjectRepository(HotelRoom)
    private readonly roomRepo: Repository<HotelRoom>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
    @InjectRepository(HotelBillDetail)
    private readonly billDetailRepo: Repository<HotelBillDetail>,
    @InjectRepository(HotelBill)
    private readonly billRepo: Repository<HotelBill>,
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

  async create(dto: CreateHotelRoomDto): Promise<HotelRoom> {
    const cooperation = await this.cooperationRepo.findOne({
      where: { id: dto.cooperationId },
    });
    if (!cooperation) {
      throw new NotFoundException(`Cooperation ${dto.cooperationId} not found`);
    }
    if (cooperation.type !== 'hotel') {
      throw new BadRequestException(
        'Rooms can only be created for hotel cooperations',
      );
    }

    const room = this.roomRepo.create({
      name: dto.name,
      cooperation,
      numberOfBeds: dto.numberOfBeds ?? 1,
      maxPeople: dto.maxPeople ?? 1,
      area: dto.area !== undefined ? dto.area.toFixed(2) : undefined,
      price: this.formatMoney(dto.price),
      numberOfRooms: dto.numberOfRooms ?? 1,
      photo: dto.photo,
      description: dto.description,
      amenities: dto.amenities ?? [],
      status: 'active',
      totalBookings: 0,
      totalRevenue: '0.00',
    });

    return this.roomRepo.save(room);
  }

  async findAll(options: RoomQueryOptions = {}): Promise<HotelRoom[]> {
    const {
      cooperationId,
      city,
      province,
      maxPeople,
      numberOfBeds,
      minPrice,
      maxPrice,
      status,
      checkInDate,
      checkOutDate,
    } = options;

    const qb = this.roomRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.cooperation', 'cooperation');

    if (cooperationId) {
      qb.andWhere('room.cooperation_id = :cooperationId', { cooperationId });
    }

    if (city) {
      qb.andWhere('cooperation.city = :city', { city });
    }

    if (province) {
      qb.andWhere('cooperation.province = :province', { province });
    }

    if (maxPeople) {
      qb.andWhere('room.maxPeople >= :maxPeople', { maxPeople });
    }

    if (numberOfBeds) {
      qb.andWhere('room.numberOfBeds >= :numberOfBeds', { numberOfBeds });
    }

    if (minPrice !== undefined) {
      qb.andWhere('room.price::numeric >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('room.price::numeric <= :maxPrice', { maxPrice });
    }

    if (status) {
      qb.andWhere('room.status = :status', { status });
    }

    const rooms = await qb.orderBy('room.createdAt', 'DESC').getMany();

    if (checkInDate && checkOutDate) {
      const parsedCheckIn = new Date(checkInDate);
      const parsedCheckOut = new Date(checkOutDate);
      if (parsedCheckOut <= parsedCheckIn) {
        throw new BadRequestException('checkOutDate must be after checkInDate');
      }

      const availabilityPromises = rooms.map(async (room) => {
        const availableCount = await this.getAvailableRoomCount(
          room.id,
          parsedCheckIn,
          parsedCheckOut,
        );
        return { room, availableCount };
      });

      const availabilityResults = await Promise.all(availabilityPromises);
      return availabilityResults
        .filter(({ availableCount }) =>
          options.quantity
            ? availableCount >= options.quantity
            : availableCount > 0,
        )
        .map(({ room, availableCount }) => {
          room.availableRooms = availableCount;
          return room;
        });
    }

    return rooms;
  }

  async findOne(
    id: number,
    dateRange?: { checkInDate?: string; checkOutDate?: string },
  ): Promise<HotelRoom> {
    const room = await this.roomRepo.findOne({
      where: { id },
      relations: { cooperation: true },
    });
    if (!room) {
      throw new NotFoundException(`Hotel room ${id} not found`);
    }

    if (dateRange?.checkInDate && dateRange?.checkOutDate) {
      const availableCount = await this.getAvailableRoomCount(
        id,
        new Date(dateRange.checkInDate),
        new Date(dateRange.checkOutDate),
      );
      room.availableRooms = availableCount;
    }

    return room;
  }

  async update(id: number, dto: UpdateHotelRoomDto): Promise<HotelRoom> {
    const room = await this.findOne(id);

    assignDefined(room, {
      name: dto.name,
      numberOfBeds: dto.numberOfBeds,
      maxPeople: dto.maxPeople,
      numberOfRooms: dto.numberOfRooms,
      photo: dto.photo,
      description: dto.description,
      amenities: dto.amenities,
    });

    if (dto.area !== undefined) {
      room.area = dto.area !== null ? dto.area.toFixed(2) : undefined;
    }

    if (dto.price !== undefined) {
      room.price = this.formatMoney(dto.price);
    }

    if (
      dto.cooperationId !== undefined &&
      dto.cooperationId !== room.cooperation?.id
    ) {
      const cooperation = await this.cooperationRepo.findOne({
        where: { id: dto.cooperationId },
      });
      if (!cooperation) {
        throw new NotFoundException(
          `Cooperation ${dto.cooperationId} not found`,
        );
      }
      if (cooperation.type !== 'hotel') {
        throw new BadRequestException(
          'Rooms can only belong to hotel cooperations',
        );
      }
      room.cooperation = cooperation;
    }

    return this.roomRepo.save(room);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const room = await this.findOne(id);
    await this.roomRepo.remove(room);
    return { id, message: 'Hotel room removed' };
  }

  async getAvailableRoomCount(
    roomId: number,
    from: Date,
    to: Date,
    excludeBillId?: number,
  ): Promise<number> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Hotel room ${roomId} not found`);
    }

    const overlappingStatuses = [
      HotelBillStatus.PENDING,
      HotelBillStatus.CONFIRMED,
      HotelBillStatus.PAID,
    ];

    const overlappingQuery = this.billDetailRepo
      .createQueryBuilder('detail')
      .select('COALESCE(SUM(detail.quantity), 0)', 'reserved')
      .leftJoin('detail.bill', 'bill')
      .where('detail.room_id = :roomId', { roomId })
      .andWhere('bill.status IN (:...statuses)', {
        statuses: overlappingStatuses,
      })
      .andWhere(
        'bill.checkInDate < :to::date AND bill.checkOutDate > :from::date',
        {
          from: from.toISOString(),
          to: to.toISOString(),
        },
      );

    if (excludeBillId) {
      overlappingQuery.andWhere('bill.id != :excludeBillId', { excludeBillId });
    }

    const overlapping = await overlappingQuery.getRawOne<{
      reserved: string;
    }>();

    const reservedCount = Number(overlapping?.reserved ?? 0);
    const available = room.numberOfRooms - reservedCount;
    return available > 0 ? available : 0;
  }

  async ensureRoomAvailability(
    room: HotelRoom,
    checkInDate: Date,
    checkOutDate: Date,
    quantity: number,
    excludeBillId?: number,
  ): Promise<void> {
    const availableCount = await this.getAvailableRoomCount(
      room.id,
      checkInDate,
      checkOutDate,
      excludeBillId,
    );
    if (availableCount < quantity) {
      throw new BadRequestException(
        `Room ${room.name} does not have enough availability`,
      );
    }
  }

  async reserveRooms(
    contexts: { room: HotelRoom; quantity: number }[],
  ): Promise<void> {
    for (const context of contexts) {
      const room = await this.roomRepo.findOne({
        where: { id: context.room.id },
      });
      if (!room) {
        throw new NotFoundException(`Hotel room ${context.room.id} not found`);
      }
      room.totalBookings += context.quantity;
      await this.roomRepo.save(room);
    }
  }

  async releaseRooms(
    contexts: { room: HotelRoom; quantity: number }[],
  ): Promise<void> {
    for (const context of contexts) {
      const room = await this.roomRepo.findOne({
        where: { id: context.room.id },
      });
      if (!room) {
        throw new NotFoundException(`Hotel room ${context.room.id} not found`);
      }
      room.totalBookings = Math.max(room.totalBookings - context.quantity, 0);
      await this.roomRepo.save(room);
    }
  }

  async incrementRoomMetrics(
    roomId: number,
    bookingCount: number,
    revenueDelta: number,
  ): Promise<void> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Hotel room ${roomId} not found`);
    }
    room.totalBookings += bookingCount;
    const currentRevenue = Number(room.totalRevenue ?? 0);
    room.totalRevenue = this.formatMoney(currentRevenue + revenueDelta);
    await this.roomRepo.save(room);
  }
}
