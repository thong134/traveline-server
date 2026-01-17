import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { MapService } from '../../../common/map/map.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { HotelRoom } from './entities/hotel-room.entity';
import { CooperationStatus } from '../../cooperation/entities/cooperation-enums';
import { User } from '../../user/entities/user.entity';
import { calculateDistance } from '../../../common/utils/location.util';
import { CreateHotelRoomDto } from './dto/create-hotel-room.dto';
import { UpdateHotelRoomDto } from './dto/update-hotel-room.dto';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { HotelBillDetail } from '../bill/entities/hotel-bill-detail.entity';
import { HotelBill, HotelBillStatus } from '../bill/entities/hotel-bill.entity';
import { assignDefined } from '../../../common/utils/object.util';

interface RoomQueryOptions {
  cooperationId?: number;
  provinceId?: string;
  districtId?: string;
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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mapService: MapService,
  ) {}

  private readonly logger = new Logger(HotelRoomsService.name);

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
      provinceId,
      districtId,
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

    if (options.provinceId) {
      qb.andWhere('cooperation.provinceId = :provinceId', {
        provinceId: options.provinceId,
      });
    }

    if (options.districtId) {
      qb.andWhere('cooperation.districtId = :districtId', {
        districtId: options.districtId,
      });
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

  // --- SEEDER LOGIC (Migrated from SeederService) ---
  async seedHotels() {
    let admin = await this.userRepo.findOne({ where: { id: 1 } });
    const partners = [
      {
        name: 'Khách sạn Hà Nội Daewoo',
        brandLogo:
          'https://firebasestorage.googleapis.com/v0/b/tour-guide-app-50140.appspot.com/o/places_photos%2FC00001_0.jpg?alt=media&token=74d00636-f7e8-4355-9fa7-4718fc7ddd69',
        representativeName: 'Daewoo Group',
        province: 'Hà Nội',
        address: '360 Kim Mã, Ngọc Khánh, Ba Đình, Hà Nội',
        latitude: 21.0307546,
        longitude: 105.8120637,
        introduction:
          'Khách sạn trang nhã, phòng ở thoáng mát, nhiều nhà họ hàng, quán bar sôi động và bể bơi ngoài trời.',
      },
      {
        name: 'Vinpearl Hotels',
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/vinpearl_logo',
        representativeName: 'Vingroup',
        province: 'Hồ Chí Minh',
        latitude: 10.7769,
        longitude: 106.7009,
      },
      {
        name: 'Fusion Hotels',
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/fusion_logo',
        representativeName: 'Fusion Group',
        province: 'Hà Nội',
      },
    ];

    for (const p of partners) {
      let coop = await this.cooperationRepo.findOne({
        where: { name: ILike(p.name) },
      });
      if (!coop) {
        coop = this.cooperationRepo.create({
          ...p,
          type: 'hotel',
          status: CooperationStatus.ACTIVE,
          manager: admin || undefined,
          revenue: '0',
          averageRating: '4.5',
          bookingTimes: 0,
        });
        await this.cooperationRepo.save(coop);
      }

      // Seed Rooms for each hotel
      const count = await this.roomRepo.count({
        where: { cooperation: { id: coop.id } },
      });
      if (count === 0) {
        await this.roomRepo.save([
          this.roomRepo.create({
            name: 'Phòng Deluxe Double',
            price: '1200000',
            maxPeople: 2,
            numberOfRooms: 10,
            cooperation: coop,
            amenities: ['Wifi', 'AC'],
            status: 'active',
          }),
          this.roomRepo.create({
            name: 'Phòng Suite King',
            price: '2500000',
            maxPeople: 2,
            numberOfRooms: 5,
            cooperation: coop,
            amenities: ['Wifi', 'AC', 'Bathtub'],
            status: 'active',
          }),
        ]);
      }
    }
    return { message: 'Hotels and rooms seeded successfully' };
  }

  // --- SEARCH HOTELS WITH MOCK AVAILABILITY ---
  async searchHotels(query: {
    latitude?: number;
    longitude?: number;
    checkInDate?: string;
    checkOutDate?: string;
    guests?: number;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const qb = this.cooperationRepo
      .createQueryBuilder('coop')
      .leftJoinAndSelect('coop.rooms', 'rooms')
      .where({ type: ILike('hotel') })
      .andWhere('coop.latitude IS NOT NULL')
      .andWhere('coop.longitude IS NOT NULL')
      .andWhere('coop.status = :status', { status: CooperationStatus.ACTIVE });

    this.logger.log(`Searching hotels with query: ${JSON.stringify(query)}`);
    let hotels = await qb.getMany();
    this.logger.log(`Found ${hotels.length} hotels from DB with coordinates.`);

    // Distance filtering if lat/lon provided
    if (query.latitude && query.longitude) {
      // 1. Pre-filter using Haversine (lightweight) to reduce OSRM calls
      const PRE_FILTER_RADIUS = 50; // 50km buffer for pre-filtering
      const candidateHotels = hotels.filter((h) => {
        if (!h.latitude || !h.longitude) {
           this.logger.warn(`Hotel ${h.name} (ID: ${h.id}) is missing coordinates. Lat: ${h.latitude}, Long: ${h.longitude}`);
           return false;
        }
        const haversineDist = calculateDistance(
          query.latitude!,
          query.longitude!,
          Number(h.latitude),
          Number(h.longitude),
        );
        return haversineDist <= PRE_FILTER_RADIUS;
      });

      this.logger.log(`Pre-filtered ${candidateHotels.length}/${hotels.length} hotels within ${PRE_FILTER_RADIUS}km (Haversine).`);

      // 2. Accurate filtering using OSRM (heavy)
      const hotelsWithDistance = await Promise.all(
        candidateHotels.map(async (h) => {
          try {
            const dist = await this.mapService.getDistance(
              query.latitude!,
              query.longitude!,
              Number(h.latitude),
              Number(h.longitude),
            );
            (h as any).distance = dist;
            this.logger.log(`Hotel ${h.name}: Lat=${h.latitude}, Long=${h.longitude}, Distance=${dist}km (Threshold: 20km)`);
            
            if (dist > 20) {
              this.logger.log(`Hotel ${h.name} excluded due to OSRM distance > 20km`);
            }
            return dist <= 20 ? h : null;
          } catch (error) {
            this.logger.error(`Failed to calculate distance for hotel ${h.name}`, error);
            return null;
          }
        }),
      );

      // Filter out nulls
      hotels = hotelsWithDistance.filter((h) => h !== null) as Cooperation[];
      hotels.sort((a, b) => (a as any).distance - (b as any).distance);
      this.logger.log(`After OSRM distance filter: ${hotels.length} hotels.`);
    }

    // Process rooms and Mock Availability
    return hotels
      .map((hotel) => {
        let filteredRooms = hotel.rooms || [];

        // Apply filters to rooms
        if (query.guests) {
          filteredRooms = filteredRooms.filter(
            (r) => r.maxPeople >= query.guests!,
          );
        }
        if (query.minPrice) {
          filteredRooms = filteredRooms.filter(
            (r) => Number(r.price) >= query.minPrice!,
          );
        }
        if (query.maxPrice) {
          filteredRooms = filteredRooms.filter(
            (r) => Number(r.price) <= query.maxPrice!,
          );
        }

        // Mock availability based on dates
        const roomsWithMock = filteredRooms.map((room) => ({
          ...room,
          availableRooms: Math.floor(Math.random() * room.numberOfRooms) + 1,
          isAvailable: Math.random() > 0.1, // 90% chance
        }));

        return {
          ...hotel,
          rooms: roomsWithMock,
        };
      })
      .filter((hotel) => hotel.rooms.length > 0);
  }
}
