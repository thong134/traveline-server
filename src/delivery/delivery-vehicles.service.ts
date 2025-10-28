import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryVehicle } from './delivery-vehicle.entity';
import { Cooperation } from '../cooperations/cooperation.entity';
import { CreateDeliveryVehicleDto } from './dto/create-delivery-vehicle.dto';
import { UpdateDeliveryVehicleDto } from './dto/update-delivery-vehicle.dto';
import { assignDefined } from '../common/utils/object.util';

@Injectable()
export class DeliveryVehiclesService {
  constructor(
    @InjectRepository(DeliveryVehicle)
    private readonly vehicleRepo: Repository<DeliveryVehicle>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
  ) {}

  private async ensureCooperation(id: number): Promise<Cooperation> {
    const cooperation = await this.cooperationRepo.findOne({ where: { id } });
    if (!cooperation) {
      throw new NotFoundException(`Cooperation ${id} not found`);
    }
    if (cooperation.type !== 'delivery') {
      throw new BadRequestException(
        'Only delivery cooperations can own delivery vehicles',
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

  async create(dto: CreateDeliveryVehicleDto): Promise<DeliveryVehicle> {
    await this.ensureCooperation(dto.cooperationId);
    const vehicle = this.vehicleRepo.create({
      cooperationId: dto.cooperationId,
      typeName: dto.typeName,
      sizeLimit: dto.sizeLimit,
      weightLimit: dto.weightLimit,
      priceLessThan10Km: this.formatMoney(dto.priceLessThan10Km),
      priceMoreThan10Km: this.formatMoney(dto.priceMoreThan10Km),
      photo: dto.photo,
      note: dto.note,
    });
    return this.vehicleRepo.save(vehicle);
  }

  async findAll(
    params: { cooperationId?: number } = {},
  ): Promise<DeliveryVehicle[]> {
    const qb = this.vehicleRepo.createQueryBuilder('vehicle');
    if (params.cooperationId) {
      qb.where('vehicle.cooperationId = :cooperationId', {
        cooperationId: params.cooperationId,
      });
    }
    return qb.orderBy('vehicle.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<DeliveryVehicle> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Delivery vehicle ${id} not found`);
    }
    return vehicle;
  }

  async update(
    id: number,
    dto: UpdateDeliveryVehicleDto,
  ): Promise<DeliveryVehicle> {
    const vehicle = await this.findOne(id);
    if (dto.cooperationId !== undefined) {
      await this.ensureCooperation(dto.cooperationId);
      vehicle.cooperationId = dto.cooperationId;
    }
    assignDefined(vehicle, {
      typeName: dto.typeName,
      sizeLimit: dto.sizeLimit,
      weightLimit: dto.weightLimit,
      photo: dto.photo,
      note: dto.note,
    });
    if (dto.priceLessThan10Km !== undefined) {
      vehicle.priceLessThan10Km = this.formatMoney(dto.priceLessThan10Km);
    }
    if (dto.priceMoreThan10Km !== undefined) {
      vehicle.priceMoreThan10Km = this.formatMoney(dto.priceMoreThan10Km);
    }
    return this.vehicleRepo.save(vehicle);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const vehicle = await this.findOne(id);
    await this.vehicleRepo.remove(vehicle);
    return { id, message: 'Delivery vehicle removed' };
  }
}
