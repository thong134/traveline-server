import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainRoute } from './entities/train-route.entity';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { CreateTrainRouteDto } from './dto/create-train-route.dto';
import { UpdateTrainRouteDto } from './dto/update-train-route.dto';
import { assignDefined } from '../../../common/utils/object.util';

@Injectable()
export class TrainRoutesService {
  constructor(
    @InjectRepository(TrainRoute)
    private readonly routeRepo: Repository<TrainRoute>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
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
    await this.ensureCooperation(dto.cooperationId);
    if (dto.durationMinutes !== undefined && dto.durationMinutes < 0) {
      throw new BadRequestException('durationMinutes must be non-negative');
    }
    const route = this.routeRepo.create({
      cooperationId: dto.cooperationId,
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
    } = {},
  ): Promise<TrainRoute[]> {
    const qb = this.routeRepo.createQueryBuilder('route');
    if (params.cooperationId) {
      qb.andWhere('route.cooperationId = :cooperationId', {
        cooperationId: params.cooperationId,
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
    const route = await this.routeRepo.findOne({ where: { id } });
    if (!route) {
      throw new NotFoundException(`Train route ${id} not found`);
    }
    return route;
  }

  async update(id: number, dto: UpdateTrainRouteDto): Promise<TrainRoute> {
    const route = await this.findOne(id);
    if (dto.cooperationId !== undefined) {
      await this.ensureCooperation(dto.cooperationId);
      route.cooperationId = dto.cooperationId;
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
}
