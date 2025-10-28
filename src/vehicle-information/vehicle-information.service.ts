import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleInformation } from './vehicle-information.entity';
import { CreateVehicleInformationDto } from './dto/create-vehicle-information.dto';
import { UpdateVehicleInformationDto } from './dto/update-vehicle-information.dto';
import { assignDefined } from '../common/utils/object.util';

@Injectable()
export class VehicleInformationService {
  constructor(
    @InjectRepository(VehicleInformation)
    private readonly repo: Repository<VehicleInformation>,
  ) {}

  async create(dto: CreateVehicleInformationDto): Promise<VehicleInformation> {
    const entity = this.repo.create({
      externalId: dto.externalId,
      type: dto.type,
      brand: dto.brand,
      model: dto.model,
      color: dto.color,
      seatingCapacity: dto.seatingCapacity ?? 0,
      fuelType: dto.fuelType,
      maxSpeed: dto.maxSpeed,
      transmission: dto.transmission,
      photo: dto.photo,
      description: dto.description,
      defaultRequirements: dto.defaultRequirements ?? [],
      defaultPricePerHour:
        dto.defaultPricePerHour !== undefined
          ? dto.defaultPricePerHour.toFixed(2)
          : undefined,
      defaultPricePerDay:
        dto.defaultPricePerDay !== undefined
          ? dto.defaultPricePerDay.toFixed(2)
          : undefined,
      active: dto.active ?? true,
    });
    return this.repo.save(entity);
  }

  async findAll(
    params: {
      type?: string;
      brand?: string;
      model?: string;
      active?: boolean;
    } = {},
  ): Promise<VehicleInformation[]> {
    const { type, brand, model, active } = params;
    const qb = this.repo.createQueryBuilder('vehicle');

    if (type) {
      qb.andWhere('vehicle.type = :type', { type });
    }

    if (brand) {
      qb.andWhere('vehicle.brand = :brand', { brand });
    }

    if (model) {
      qb.andWhere('vehicle.model = :model', { model });
    }

    if (typeof active === 'boolean') {
      qb.andWhere('vehicle.active = :active', { active });
    }

    return qb
      .orderBy('vehicle.brand', 'ASC')
      .addOrderBy('vehicle.model', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<VehicleInformation> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Vehicle information ${id} not found`);
    }
    return entity;
  }

  async update(
    id: number,
    dto: UpdateVehicleInformationDto,
  ): Promise<VehicleInformation> {
    const entity = await this.findOne(id);

    assignDefined(entity, {
      externalId: dto.externalId,
      type: dto.type,
      brand: dto.brand,
      model: dto.model,
      color: dto.color,
      seatingCapacity: dto.seatingCapacity,
      fuelType: dto.fuelType,
      maxSpeed: dto.maxSpeed,
      transmission: dto.transmission,
      photo: dto.photo,
      description: dto.description,
      active: dto.active,
    });

    if (dto.defaultRequirements) {
      entity.defaultRequirements = dto.defaultRequirements;
    }

    if (dto.defaultPricePerHour !== undefined) {
      entity.defaultPricePerHour = dto.defaultPricePerHour.toFixed(2);
    }

    if (dto.defaultPricePerDay !== undefined) {
      entity.defaultPricePerDay = dto.defaultPricePerDay.toFixed(2);
    }

    return this.repo.save(entity);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
    return { id, message: 'Vehicle information removed' };
  }
}
