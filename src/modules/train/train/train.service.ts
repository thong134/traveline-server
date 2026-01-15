import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { TrainRoute } from './entities/train-route.entity';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { CreateTrainRouteDto } from './dto/create-train-route.dto';
import { UpdateTrainRouteDto } from './dto/update-train-route.dto';
import { CooperationStatus } from '../../cooperation/entities/cooperation-enums';
import { User } from '../../user/entities/user.entity';
import { assignDefined } from '../../../common/utils/object.util';

@Injectable()
export class TrainRoutesService {
  constructor(
    @InjectRepository(TrainRoute)
    private readonly routeRepo: Repository<TrainRoute>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async ensureCooperation(id: number): Promise<Cooperation> {
    const cooperation = await this.cooperationRepo.findOne({ where: { id } });
    if (!cooperation) {
      throw new NotFoundException(`Cooperation ${id} not found`);
    }
    if (cooperation.type !== 'train') {
      throw new BadRequestException(
        'Cooperation must be of type train to manage routes',
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

  async create(dto: CreateTrainRouteDto): Promise<TrainRoute> {
    const cooperation = await this.ensureCooperation(dto.cooperationId);
    if (dto.durationMinutes !== undefined && dto.durationMinutes < 0) {
      throw new BadRequestException('durationMinutes must be non-negative');
    }
    const route = this.routeRepo.create({
      cooperation,
      name: dto.name,
      departureStation: dto.departureStation,
      arrivalStation: dto.arrivalStation,
      departureTime: dto.departureTime,
      arrivalTime: dto.arrivalTime,
      durationMinutes: dto.durationMinutes ?? 0,
      basePrice: this.formatMoney(dto.basePrice) ?? '0.00',
      seatCapacity: dto.seatCapacity ?? 0,
      seatClass: dto.seatClass,
      amenities: dto.amenities,
      photo: dto.photo,
      note: dto.note,
    });
    return this.routeRepo.save(route);
  }

  async findAll(
    params: {
      cooperationId?: number;
      departureStation?: string;
      arrivalStation?: string;
      provinceId?: string;
      districtId?: string;
    } = {},
  ): Promise<TrainRoute[]> {
    const qb = this.routeRepo
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.cooperation', 'cooperation');

    if (params.cooperationId) {
      qb.andWhere('route.cooperation_id = :cooperationId', {
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
    if (params.departureStation) {
      qb.andWhere('route.departureStation ILIKE :departure', {
        departure: `%${params.departureStation}%`,
      });
    }
    if (params.arrivalStation) {
      qb.andWhere('route.arrivalStation ILIKE :arrival', {
        arrival: `%${params.arrivalStation}%`,
      });
    }
    return qb.orderBy('route.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<TrainRoute> {
    const route = await this.routeRepo.findOne({
      where: { id },
      relations: { cooperation: true },
    });
    if (!route) {
      throw new NotFoundException(`Train route ${id} not found`);
    }
    return route;
  }

  async update(id: number, dto: UpdateTrainRouteDto): Promise<TrainRoute> {
    const route = await this.findOne(id);
    if (dto.cooperationId !== undefined) {
      route.cooperation = await this.ensureCooperation(dto.cooperationId);
    }
    if (dto.durationMinutes !== undefined && dto.durationMinutes < 0) {
      throw new BadRequestException('durationMinutes must be non-negative');
    }
    assignDefined(route, {
      name: dto.name,
      departureStation: dto.departureStation,
      arrivalStation: dto.arrivalStation,
      departureTime: dto.departureTime,
      arrivalTime: dto.arrivalTime,
      durationMinutes: dto.durationMinutes,
      seatCapacity: dto.seatCapacity,
      seatClass: dto.seatClass,
      amenities: dto.amenities,
      photo: dto.photo,
      note: dto.note,
    });
    if (dto.basePrice !== undefined) {
      route.basePrice = this.formatMoney(dto.basePrice) ?? route.basePrice;
    }
    return this.routeRepo.save(route);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const route = await this.findOne(id);
    await this.routeRepo.remove(route);
    return { id, message: 'Train route removed' };
  }

  // --- SEEDER LOGIC ---
  async seedTrain() {
    let admin = await this.userRepo.findOne({ where: { id: 1 } });
    const partners = [
      {
        name: 'Đường sắt Việt Nam (DSVN)',
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/dsvn_logo',
        representativeName: 'Tổng Công Ty DSVN',
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
          type: 'train',
          status: CooperationStatus.ACTIVE,
          manager: admin || undefined,
          revenue: '0',
          averageRating: '4.5',
          bookingTimes: 0,
        });
        await this.cooperationRepo.save(coop);
      }

      // Seed Train Routes
      const count = await this.routeRepo.count({
        where: { cooperation: { id: coop.id } },
      });
      if (count === 0) {
        await this.routeRepo.save([
          this.routeRepo.create({
            name: 'Tàu Thống Nhất SE1',
            departureStation: 'Hà Nội',
            arrivalStation: 'Sài Gòn',
            departureTime: '22:15:00+07',
            arrivalTime: '05:45:00+07',
            basePrice: '1100000',
            seatCapacity: 400,
            cooperation: coop,
          }),
          this.routeRepo.create({
            name: 'Tàu SE3',
            departureStation: 'Hà Nội',
            arrivalStation: 'Đà Nẵng',
            departureTime: '19:25:00+07',
            arrivalTime: '11:15:00+07',
            basePrice: '750000',
            seatCapacity: 300,
            cooperation: coop,
          }),
        ]);
      }
    }
    return { message: 'Train partners and routes seeded successfully' };
  }

  // --- SEARCH TRAIN ROUTES WITH MOCK SEAT MAPS ---
  async searchTrainRoutes(query: {
    from: string;
    to: string;
    date: string;
    isRoundTrip?: boolean;
    passengers?: number;
  }) {
    const qb = this.cooperationRepo
      .createQueryBuilder('coop')
      .leftJoinAndSelect('coop.trainRoutes', 'routes')
      .where('coop.type = :type', { type: 'train' })
      .andWhere('coop.status = :status', { status: CooperationStatus.ACTIVE });

    const partners = await qb.getMany();
    const results: any[] = [];

    const searchFrom = query.from?.toLowerCase() || '';
    const searchTo = query.to?.toLowerCase() || '';

    for (const p of partners) {
      if (!p.trainRoutes) continue;

      const matchedRoutes = p.trainRoutes.filter((route) => {
        const fromMatch = route.departureStation?.toLowerCase().includes(searchFrom);
        const toMatch = route.arrivalStation?.toLowerCase().includes(searchTo);
        return fromMatch && toMatch;
      });

      for (const route of matchedRoutes) {
        results.push({
          ...route,
          partnerName: p.name,
          partnerLogo: p.brandLogo,
          departureDate: query.date,
          seatMap: this.generateSeatMap(route.seatCapacity || 400),
          availableSeats: Math.floor(Math.random() * (route.seatCapacity || 400)),
        });
      }
    }

    return results;
  }

  private generateSeatMap(total: number) {
    const map: any[] = [];
    const actualSeats = Math.min(total, 60); // Show max 60 seats for performance
    for (let i = 1; i <= actualSeats; i++) {
      map.push({
        id: i,
        label: `${Math.ceil(i / 4)}${String.fromCharCode(65 + (i % 4))}`,
        booked: Math.random() > 0.5,
      });
    }
    return map;
  }
}
