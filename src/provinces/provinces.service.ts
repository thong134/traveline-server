import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Province } from './province.entity';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';

@Injectable()
export class ProvincesService {
  constructor(
    @InjectRepository(Province)
    private readonly repo: Repository<Province>,
  ) {}

  async create(dto: CreateProvinceDto): Promise<Province> {
    const province = this.repo.create({
      ...dto,
      active: dto.active ?? true,
    });
    return this.repo.save(province);
  }

  async findAll(
    options: { q?: string; region?: string; active?: boolean } = {},
  ): Promise<Province[]> {
    const { q, region, active } = options;
    const qb = this.repo.createQueryBuilder('province');

    if (q) {
      qb.andWhere('(province.name ILIKE :q OR province.code ILIKE :q)', {
        q: `%${q}%`,
      });
    }

    if (region) {
      qb.andWhere('province.region = :region', { region });
    }

    if (typeof active === 'boolean') {
      qb.andWhere('province.active = :active', { active });
    }

    return qb.orderBy('province.name', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Province> {
    const province = await this.repo.findOne({ where: { id } });
    if (!province) {
      throw new NotFoundException(`Province ${id} not found`);
    }
    return province;
  }

  findByCode(code: string): Promise<Province | null> {
    return this.repo.findOne({ where: { code } });
  }

  async update(id: number, dto: UpdateProvinceDto): Promise<Province> {
    const province = await this.findOne(id);
    Object.assign(province, dto);
    return this.repo.save(province);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const province = await this.findOne(id);
    await this.repo.remove(province);
    return { id, message: 'Province deleted' };
  }
}
