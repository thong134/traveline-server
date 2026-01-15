import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { BusType } from './entities/bus-type.entity';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { CreateBusTypeDto } from './dto/create-bus-type.dto';
import { UpdateBusTypeDto } from './dto/update-bus-type.dto';
import { CooperationStatus } from '../../cooperation/entities/cooperation-enums';
import { User } from '../../user/entities/user.entity';
import { assignDefined } from '../../../common/utils/object.util';

@Injectable()
export class BusTypesService {
  constructor(
    @InjectRepository(BusType)
    private readonly busTypeRepo: Repository<BusType>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async ensureCooperation(id: number): Promise<Cooperation> {
    const cooperation = await this.cooperationRepo.findOne({
      where: { id },
    });
    if (!cooperation) {
      throw new NotFoundException(`Cooperation ${id} not found`);
    }
    if (cooperation.type !== 'bus') {
      throw new BadRequestException(
        'Cooperation must be of type bus to manage bus types',
      );
    }
    return cooperation;
  }

  private formatMoney(value?: number): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return value.toFixed(2);
  }

  async create(dto: CreateBusTypeDto): Promise<BusType> {
    const cooperation = await this.ensureCooperation(dto.cooperationId);
    const busType = this.busTypeRepo.create({
      cooperation,
      name: dto.name,
      numberOfSeats: dto.numberOfSeats ?? 0,
      numberOfBuses: dto.numberOfBuses ?? 0,
      price: this.formatMoney(dto.price) ?? '0.00',
      route: dto.route,
      photo: dto.photo,
    });
    return this.busTypeRepo.save(busType);
  }

  async findAll(
    params: {
      cooperationId?: number;
      provinceId?: string;
      districtId?: string;
      q?: string;
    } = {},
  ): Promise<BusType[]> {
    const qb = this.busTypeRepo
      .createQueryBuilder('type')
      .leftJoinAndSelect('type.cooperation', 'cooperation');

    if (params.cooperationId) {
      qb.andWhere('type.cooperation_id = :cooperationId', {
        cooperationId: params.cooperationId,
      });
    }
    if (params.provinceId) {
      qb.andWhere('cooperation.provinceId = :provinceId', {
        provinceId: params.provinceId,
      });
    }
    if (params.districtId) {
      qb.andWhere('cooperation.districtId = :districtId', {
        districtId: params.districtId,
      });
    }
    if (params.q) {
      qb.andWhere('type.route ILIKE :q', { q: `%${params.q}%` });
    }
    return qb.orderBy('type.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<BusType> {
    const busType = await this.busTypeRepo.findOne({
      where: { id },
      relations: { cooperation: true },
    });
    if (!busType) {
      throw new NotFoundException(`Bus type ${id} not found`);
    }
    return busType;
  }

  async update(id: number, dto: UpdateBusTypeDto): Promise<BusType> {
    const busType = await this.findOne(id);
    if (dto.cooperationId !== undefined) {
      busType.cooperation = await this.ensureCooperation(dto.cooperationId);
    }
    assignDefined(busType, {
      name: dto.name,
      numberOfSeats: dto.numberOfSeats,
      numberOfBuses: dto.numberOfBuses,
      route: dto.route,
      photo: dto.photo,
    });
    if (dto.price !== undefined) {
      busType.price = this.formatMoney(dto.price) ?? busType.price;
    }
    return this.busTypeRepo.save(busType);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const busType = await this.findOne(id);
    await this.busTypeRepo.remove(busType);
    return { id, message: 'Bus type removed' };
  }

  // --- SEEDER LOGIC ---
  async seedBus() {
    let admin = await this.userRepo.findOne({ where: { id: 1 } });
    const partners = [
      {
        name: 'Phương Trang (FUTA Bus)',
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/futa_logo',
        representativeName: 'Nguyễn Văn A',
        province: 'Hồ Chí Minh',
      },
      {
        name: 'Mai Linh Express',
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/mailinh_logo',
        representativeName: 'Trần Văn B',
        province: 'Hồ Chí Minh',
      },
      {
        name: 'Thành Bưởi',
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/thanhbuoi_logo',
        representativeName: 'Lê Văn C',
        province: 'Lâm Đồng',
      },
    ];

    for (const p of partners) {
      let coop = await this.cooperationRepo.findOne({
        where: { name: ILike(p.name) },
      });
      if (!coop) {
        coop = this.cooperationRepo.create({
          ...p,
          type: 'bus',
          status: CooperationStatus.ACTIVE,
          manager: admin || undefined,
          revenue: '0',
          averageRating: '4.7',
          bookingTimes: 0,
        });
        await this.cooperationRepo.save(coop);
      }

      // Seed Bus Types/Trips
      const count = await this.busTypeRepo.count({
        where: { cooperation: { id: coop.id } },
      });
      if (count === 0) {
        await this.busTypeRepo.save([
          this.busTypeRepo.create({
            name: 'Xe giường nằm 36 chỗ',
            numberOfSeats: 36,
            numberOfBuses: 50,
            price: '250000',
            route: 'Hồ Chí Minh - Đà Lạt',
            cooperation: coop,
          }),
          this.busTypeRepo.create({
            name: 'Xe Limousine 9 chỗ',
            numberOfSeats: 9,
            numberOfBuses: 20,
            price: '450000',
            route: 'Hồ Chí Minh - Vũng Tàu',
            cooperation: coop,
          }),
        ]);
      }
    }
    return { message: 'Bus partners and trips seeded successfully' };
  }

  // --- SEARCH BUS TRIPS WITH MOCK SEAT MAPS ---
  async searchBusTrips(query: {
    from: string;
    to: string;
    date: string;
    isRoundTrip?: boolean;
    passengers?: number;
  }) {
    const qb = this.cooperationRepo
      .createQueryBuilder('coop')
      .leftJoinAndSelect('coop.busTypes', 'types')
      .where('coop.type = :type', { type: 'bus' })
      .andWhere('coop.status = :status', { status: CooperationStatus.ACTIVE });

    const partners = await qb.getMany();
    const results: any[] = [];

    const searchFrom = query.from?.toLowerCase() || '';
    const searchTo = query.to?.toLowerCase() || '';

    for (const p of partners) {
      if (!p.busTypes) continue;

      const matchedTrips = p.busTypes.filter((trip) => {
        const route = trip.route?.toLowerCase() || '';
        return route.includes(searchFrom) && route.includes(searchTo);
      });

      for (const trip of matchedTrips) {
        results.push({
          ...trip,
          partnerName: p.name,
          partnerLogo: p.brandLogo,
          departureDate: query.date,
          seatMap: this.generateSeatMap(trip.numberOfSeats || 36),
          availableSeats: Math.floor(Math.random() * (trip.numberOfSeats || 36)),
        });
      }
    }

    return results;
  }

  private generateSeatMap(total: number) {
    const map: any[] = [];
    for (let i = 1; i <= total; i++) {
      map.push({
        id: i,
        label: `${Math.ceil(i / 2)}${i % 2 === 0 ? 'B' : 'A'}`,
        booked: Math.random() > 0.6,
      });
    }
    return map;
  }
}
