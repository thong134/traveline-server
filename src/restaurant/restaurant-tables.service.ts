import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cooperation } from '../cooperations/cooperation.entity';
import { RestaurantTable } from './restaurant-table.entity';
import { CreateRestaurantTableDto } from './dto/create-restaurant-table.dto';
import { UpdateRestaurantTableDto } from './dto/update-restaurant-table.dto';
import { assignDefined } from '../common/utils/object.util';

@Injectable()
export class RestaurantTablesService {
  constructor(
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
  ) {}

  private async ensureCooperation(id: number): Promise<Cooperation> {
    const cooperation = await this.cooperationRepo.findOne({ where: { id } });
    if (!cooperation) {
      throw new NotFoundException(`Cooperation ${id} not found`);
    }
    if (cooperation.type !== 'restaurant') {
      throw new BadRequestException(
        'Cooperation must be of type restaurant to manage tables',
      );
    }
    return cooperation;
  }

  async create(dto: CreateRestaurantTableDto): Promise<RestaurantTable> {
    await this.ensureCooperation(dto.cooperationId);
    const table = this.tableRepo.create({
      cooperationId: dto.cooperationId,
      name: dto.name,
      quantity: dto.quantity ?? 1,
      dishType: dto.dishType,
      priceRange: dto.priceRange,
      maxPeople: dto.maxPeople,
      photo: dto.photo,
      note: dto.note,
      active: dto.active ?? true,
    });
    return this.tableRepo.save(table);
  }

  async findAll(
    params: { cooperationId?: number; active?: boolean } = {},
  ): Promise<RestaurantTable[]> {
    const qb = this.tableRepo.createQueryBuilder('table');
    if (params.cooperationId) {
      qb.andWhere('table.cooperationId = :cooperationId', {
        cooperationId: params.cooperationId,
      });
    }
    if (typeof params.active === 'boolean') {
      qb.andWhere('table.active = :active', { active: params.active });
    }
    return qb.orderBy('table.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<RestaurantTable> {
    const table = await this.tableRepo.findOne({ where: { id } });
    if (!table) {
      throw new NotFoundException(`Restaurant table ${id} not found`);
    }
    return table;
  }

  async update(
    id: number,
    dto: UpdateRestaurantTableDto,
  ): Promise<RestaurantTable> {
    const table = await this.findOne(id);
    if (dto.cooperationId !== undefined) {
      await this.ensureCooperation(dto.cooperationId);
      table.cooperationId = dto.cooperationId;
    }
    assignDefined(table, {
      name: dto.name,
      quantity: dto.quantity,
      dishType: dto.dishType,
      priceRange: dto.priceRange,
      maxPeople: dto.maxPeople,
      photo: dto.photo,
      note: dto.note,
    });
    if (dto.active !== undefined) {
      table.active = dto.active;
    }
    return this.tableRepo.save(table);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const table = await this.findOne(id);
    await this.tableRepo.remove(table);
    return { id, message: 'Restaurant table removed' };
  }
}
