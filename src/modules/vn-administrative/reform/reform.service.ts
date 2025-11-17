import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ReformProvince } from './entities/reform-province.entity';
import { ReformCommune } from './entities/reform-commune.entity';

@Injectable()
export class ReformAdministrativeService {
  constructor(
    @InjectRepository(ReformProvince)
    private readonly provinceRepo: Repository<ReformProvince>,
    @InjectRepository(ReformCommune)
    private readonly communeRepo: Repository<ReformCommune>,
  ) {}

  findProvinces(params: { search?: string } = {}): Promise<ReformProvince[]> {
    const { search } = params;
    const where = search
      ? [
          { name: ILike(`%${search}%`) },
          { nameEn: ILike(`%${search}%`) },
          { code: ILike(`%${search}%`) },
        ]
      : undefined;

    return this.provinceRepo.find({
      where,
      order: { name: 'ASC' },
      take: 200,
    });
  }

  async findProvinceByCode(
    code: string,
    includeCommunes = false,
  ): Promise<ReformProvince> {
    const province = await this.provinceRepo.findOne({
      where: { code },
    });

    if (!province) {
      throw new NotFoundException(`Reform province ${code} not found`);
    }

    if (includeCommunes) {
      const communes = await this.findCommunesByProvince(code);
      (province as ReformProvince & { communes?: ReformCommune[] }).communes =
        communes;
    }

    return province;
  }

  findCommunesByProvince(provinceCode: string): Promise<ReformCommune[]> {
    return this.communeRepo.find({
      where: { provinceCode },
      order: { name: 'ASC' },
      take: 500,
    });
  }

  async findCommuneByCode(code: string): Promise<ReformCommune> {
    const commune = await this.communeRepo.findOne({
      where: { code },
      relations: { province: true },
    });
    if (!commune) {
      throw new NotFoundException(`Reform commune ${code} not found`);
    }
    return commune;
  }
}
