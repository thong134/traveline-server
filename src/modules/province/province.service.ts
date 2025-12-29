import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Province } from './entities/province.entity';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';

@Injectable()
export class ProvincesService {
  constructor(
    @InjectRepository(Province)
    private readonly repo: Repository<Province>,
  ) {}

  async create(dto: CreateProvinceDto): Promise<Province> {
    const province = this.repo.create(dto);
    return this.repo.save(province);
  }

  async findAll(
    options: { q?: string } = {},
  ): Promise<Province[]> {
    const { q } = options;
    const qb = this.repo.createQueryBuilder('province');

    if (q) {
      qb.andWhere('(province.name ILIKE :q OR province.code ILIKE :q OR province.fullName ILIKE :q)', {
        q: `%${q}%`,
      });
    }

    return qb.orderBy('province.name', 'ASC').getMany();
  }

  async findOne(code: string): Promise<Province> {
    const province = await this.repo.findOne({ where: { code } });
    if (!province) {
      throw new NotFoundException(`Province with code ${code} not found`);
    }
    return province;
  }

  async update(code: string, dto: UpdateProvinceDto): Promise<Province> {
    const province = await this.findOne(code);
    Object.assign(province, dto);
    return this.repo.save(province);
  }

  async bulkUpdate(
    updates: { code: string; avatarUrl?: string }[],
  ): Promise<Province[]> {
    const codes = updates.map((u) => u.code);
    const provinces = await this.repo.find({
      where: updates.map((u) => ({ code: u.code })),
    });

    const provinceMap = new Map(provinces.map((p) => [p.code, p]));

    for (const update of updates) {
      const province = provinceMap.get(update.code);
      if (province) {
        if (update.avatarUrl !== undefined) province.avatarUrl = update.avatarUrl;
      }
    }

    return this.repo.save(provinces);
  }

  async remove(code: string): Promise<{ code: string; message: string }> {
    const province = await this.findOne(code);
    await this.repo.remove(province);
    return { code, message: 'Province deleted' };
  }
}
