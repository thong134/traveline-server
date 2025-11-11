import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusType } from './entities/bus-type.entity';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { CreateBusTypeDto } from './dto/create-bus-type.dto';
import { UpdateBusTypeDto } from './dto/update-bus-type.dto';
import { assignDefined } from '../../../common/utils/object.util';

@Injectable()
export class BusTypesService {
  constructor(
    @InjectRepository(BusType)
    private readonly busTypeRepo: Repository<BusType>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
  ) {}

  private async ensureCooperation(id: number): Promise<Cooperation> {
    const cooperation = await this.cooperationRepo.findOne({ where: { id } });
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
    await this.ensureCooperation(dto.cooperationId);
    const busType = this.busTypeRepo.create({
      cooperationId: dto.cooperationId,
      name: dto.name,
      numberOfSeats: dto.numberOfSeats ?? 0,
      numberOfBuses: dto.numberOfBuses ?? 0,
      price: this.formatMoney(dto.price) ?? '0.00',
      route: dto.route,
      photo: dto.photo,
    });
    return this.busTypeRepo.save(busType);
  }

  async findAll(params: { cooperationId?: number } = {}): Promise<BusType[]> {
    const qb = this.busTypeRepo.createQueryBuilder('type');
    if (params.cooperationId) {
      qb.andWhere('type.cooperationId = :cooperationId', {
        cooperationId: params.cooperationId,
      });
    }
    return qb.orderBy('type.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<BusType> {
    const busType = await this.busTypeRepo.findOne({ where: { id } });
    if (!busType) {
      throw new NotFoundException(`Bus type ${id} not found`);
    }
    return busType;
  }

  async update(id: number, dto: UpdateBusTypeDto): Promise<BusType> {
    const busType = await this.findOne(id);
    if (dto.cooperationId !== undefined) {
      await this.ensureCooperation(dto.cooperationId);
      busType.cooperationId = dto.cooperationId;
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
}
