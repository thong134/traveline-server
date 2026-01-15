import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Flight } from './entities/flight.entity';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { CooperationStatus } from '../../cooperation/entities/cooperation-enums';
import { User } from '../../user/entities/user.entity';
import { assignDefined } from '../../../common/utils/object.util';

@Injectable()
export class FlightsService {
  constructor(
    @InjectRepository(Flight)
    private readonly flightRepo: Repository<Flight>,
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
    if (cooperation.type !== 'flight') {
      throw new BadRequestException(
        'Cooperation must be of type flight to manage flights',
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

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} is invalid`);
    }
    return date;
  }

  async create(dto: CreateFlightDto): Promise<Flight> {
    const cooperation = await this.ensureCooperation(dto.cooperationId);
    if (dto.durationMinutes !== undefined && dto.durationMinutes < 0) {
      throw new BadRequestException('durationMinutes must be non-negative');
    }
    const departureTime = dto.departureTime;
    const arrivalTime = dto.arrivalTime;
    if (arrivalTime <= departureTime) {
      throw new BadRequestException('arrivalTime must be after departureTime');
    }
    const flight = this.flightRepo.create({
      cooperation,
      flightNumber: dto.flightNumber,
      airline: dto.airline,
      departureAirport: dto.departureAirport,
      arrivalAirport: dto.arrivalAirport,
      departureTime,
      arrivalTime,
      durationMinutes: dto.durationMinutes ?? 0,
      basePrice: this.formatMoney(dto.basePrice) ?? '0.00',
      seatCapacity: dto.seatCapacity ?? 0,
      cabinClass: dto.cabinClass,
      baggageAllowance: dto.baggageAllowance,
      photo: dto.photo,
      note: dto.note,
    });
    return this.flightRepo.save(flight);
  }

  async findAll(
    params: {
      cooperationId?: number;
      airline?: string;
      departureAirport?: string;
      arrivalAirport?: string;
      provinceId?: string;
      districtId?: string;
    } = {},
  ): Promise<Flight[]> {
    const qb = this.flightRepo
      .createQueryBuilder('flight')
      .leftJoinAndSelect('flight.cooperation', 'cooperation');

    if (params.cooperationId) {
      qb.andWhere('flight.cooperation_id = :cooperationId', {
        cooperationId: params.cooperationId,
      });
    }
    if (params.airline) {
      qb.andWhere('flight.airline ILIKE :airline', {
        airline: `%${params.airline}%`,
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
    if (params.departureAirport) {
      qb.andWhere('flight.departureAirport ILIKE :departureAirport', {
        departureAirport: `%${params.departureAirport}%`,
      });
    }
    if (params.arrivalAirport) {
      qb.andWhere('flight.arrivalAirport ILIKE :arrivalAirport', {
        arrivalAirport: `%${params.arrivalAirport}%`,
      });
    }
    return qb.orderBy('flight.departureTime', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Flight> {
    const flight = await this.flightRepo.findOne({
      where: { id },
      relations: { cooperation: true },
    });
    if (!flight) {
      throw new NotFoundException(`Flight ${id} not found`);
    }
    return flight;
  }

  async update(id: number, dto: UpdateFlightDto): Promise<Flight> {
    const flight = await this.findOne(id);
    if (dto.cooperationId !== undefined) {
      flight.cooperation = await this.ensureCooperation(dto.cooperationId);
    }
    if (dto.durationMinutes !== undefined && dto.durationMinutes < 0) {
      throw new BadRequestException('durationMinutes must be non-negative');
    }

    let departureTime = flight.departureTime;
    if (dto.departureTime !== undefined) {
      departureTime = dto.departureTime;
    }
    let arrivalTime = flight.arrivalTime;
    if (dto.arrivalTime !== undefined) {
      arrivalTime = dto.arrivalTime;
    }
    if (arrivalTime <= departureTime) {
      throw new BadRequestException('arrivalTime must be after departureTime');
    }
    flight.departureTime = departureTime;
    flight.arrivalTime = arrivalTime;

    assignDefined(flight, {
      flightNumber: dto.flightNumber,
      airline: dto.airline,
      departureAirport: dto.departureAirport,
      arrivalAirport: dto.arrivalAirport,
      durationMinutes: dto.durationMinutes,
      seatCapacity: dto.seatCapacity,
      cabinClass: dto.cabinClass,
      baggageAllowance: dto.baggageAllowance,
      photo: dto.photo,
      note: dto.note,
    });

    if (dto.basePrice !== undefined) {
      flight.basePrice = this.formatMoney(dto.basePrice) ?? flight.basePrice;
    }

    return this.flightRepo.save(flight);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const flight = await this.findOne(id);
    await this.flightRepo.remove(flight);
    return { id, message: 'Flight removed' };
  }

  // --- SEEDER LOGIC ---
  async seedFlights() {
    let admin = await this.userRepo.findOne({ where: { id: 1 } });
    const partners = [
      {
        name: 'Vietnam Airlines',
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/vna_logo',
        representativeName: 'VNA Group',
        province: 'Hà Nội',
      },
      {
        name: 'VietJet Air',
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/vietjet_logo',
        representativeName: 'VJC Group',
        province: 'Hồ Chí Minh',
      },
    ];

    for (const p of partners) {
      let coop = await this.cooperationRepo.findOne({
        where: { name: ILike(p.name) },
      });
      if (!coop) {
        coop = this.cooperationRepo.create({
          ...p,
          type: 'flight',
          status: CooperationStatus.ACTIVE,
          manager: admin || undefined,
          revenue: '0',
          averageRating: '4.4',
          bookingTimes: 0,
        });
        await this.cooperationRepo.save(coop);
      }

      // Seed Flights
      const count = await this.flightRepo.count({
        where: { cooperation: { id: coop.id } },
      });
      if (count === 0) {
        const now = new Date();
        const later = new Date(now.getTime() + 2 * 3600000);
        await this.flightRepo.save([
          this.flightRepo.create({
            flightNumber: 'VN123',
            airline: coop.name,
            departureAirport: 'SGN',
            arrivalAirport: 'HAN',
            departureTime: now,
            arrivalTime: later,
            basePrice: '1500000',
            seatCapacity: 180,
            cooperation: coop,
          }),
          this.flightRepo.create({
            flightNumber: 'VJ456',
            airline: coop.name,
            departureAirport: 'SGN',
            arrivalAirport: 'DAD',
            departureTime: now,
            arrivalTime: later,
            basePrice: '1200000',
            seatCapacity: 230,
            cooperation: coop,
          }),
        ]);
      }
    }
    return { message: 'Flight partners and schedules seeded successfully' };
  }

  // --- SEARCH FLIGHTS WITH MOCK SEAT MAPS ---
  async searchFlights(query: {
    from: string;
    to: string;
    date: string;
    isRoundTrip?: boolean;
    passengers?: number;
  }) {
    const qb = this.cooperationRepo
      .createQueryBuilder('coop')
      .leftJoinAndSelect('coop.flights', 'flights')
      .where('coop.type = :type', { type: 'flight' })
      .andWhere('coop.status = :status', { status: CooperationStatus.ACTIVE });

    const partners = await qb.getMany();
    const results: any[] = [];

    const searchFrom = query.from?.toLowerCase() || '';
    const searchTo = query.to?.toLowerCase() || '';

    for (const p of partners) {
      if (!p.flights) continue;

      const matchedFlights = p.flights.filter((f) => {
        const fromMatch = f.departureAirport?.toLowerCase().includes(searchFrom);
        const toMatch = f.arrivalAirport?.toLowerCase().includes(searchTo);
        return fromMatch && toMatch;
      });

      for (const flight of matchedFlights) {
        results.push({
          ...flight,
          partnerName: p.name,
          partnerLogo: p.brandLogo,
          departureDate: query.date,
          seatMap: this.generateSeatMap(flight.seatCapacity || 180),
          availableSeats: Math.floor(Math.random() * (flight.seatCapacity || 180)),
        });
      }
    }

    return results;
  }

  private generateSeatMap(total: number) {
    const map: any[] = [];
    const actualSeats = Math.min(total, 60); 
    for (let i = 1; i <= actualSeats; i++) {
      map.push({
        id: i,
        label: `${Math.ceil(i / 6)}${String.fromCharCode(65 + (i % 6))}`,
        booked: Math.random() > 0.4,
      });
    }
    return map;
  }
}
