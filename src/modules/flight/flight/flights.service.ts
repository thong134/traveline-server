import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flight } from './entities/flight.entity';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { assignDefined } from '../../../common/utils/object.util';

@Injectable()
export class FlightsService {
  constructor(
    @InjectRepository(Flight)
    private readonly flightRepo: Repository<Flight>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
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
    const departureTime = this.parseDate(dto.departureTime, 'departureTime');
    const arrivalTime = this.parseDate(dto.arrivalTime, 'arrivalTime');
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
    } = {},
  ): Promise<Flight[]> {
    const qb = this.flightRepo.createQueryBuilder('flight');
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
      departureTime = this.parseDate(dto.departureTime, 'departureTime');
    }
    let arrivalTime = flight.arrivalTime;
    if (dto.arrivalTime !== undefined) {
      arrivalTime = this.parseDate(dto.arrivalTime, 'arrivalTime');
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
}
