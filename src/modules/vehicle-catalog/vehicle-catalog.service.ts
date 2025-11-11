import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleCatalog } from './entities/vehicle-catalog.entity';
import { CreateVehicleCatalogDto } from './dto/create-vehicle-catalog.dto';
import { UpdateVehicleCatalogDto } from './dto/update-vehicle-catalog.dto';
import { assignDefined } from '../../common/utils/object.util';

@Injectable()
export class VehicleCatalogService {
  constructor(
    @InjectRepository(VehicleCatalog)
    private readonly repo: Repository<VehicleCatalog>,
  ) {}

  async create(dto: CreateVehicleCatalogDto): Promise<VehicleCatalog> {
    const entity = this.repo.create({
      type: dto.type,
      brand: dto.brand,
      model: dto.model,
      color: dto.color,
      seatingCapacity: dto.seatingCapacity ?? 0,
      fuelType: dto.fuelType,
      maxSpeed: dto.maxSpeed,
      transmission: dto.transmission,
      photo: dto.photo,
    });
    return this.repo.save(entity);
  }

  async findAll(
    params: {
      type?: string;
      brand?: string;
      model?: string;
    } = {},
  ): Promise<VehicleCatalog[]> {
    const { type, brand, model } = params;
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

    return qb
      .orderBy('vehicle.brand', 'ASC')
      .addOrderBy('vehicle.model', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<VehicleCatalog> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Vehicle catalog ${id} not found`);
    }
    return entity;
  }

  async update(
    id: number,
    dto: UpdateVehicleCatalogDto,
  ): Promise<VehicleCatalog> {
    const entity = await this.findOne(id);

    assignDefined(entity, {
      type: dto.type,
      brand: dto.brand,
      model: dto.model,
      color: dto.color,
      seatingCapacity: dto.seatingCapacity,
      fuelType: dto.fuelType,
      maxSpeed: dto.maxSpeed,
      transmission: dto.transmission,
      photo: dto.photo,
    });

    return this.repo.save(entity);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
    return { id, message: 'Vehicle catalog removed' };
  }
}
