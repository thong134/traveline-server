import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LegacyProvince } from './entities/legacy-province.entity';
import { LegacyDistrict } from './entities/legacy-district.entity';
import { LegacyWard } from './entities/legacy-ward.entity';

@Injectable()
export class LegacyAdministrativeService {
  constructor(
    @InjectRepository(LegacyProvince)
    private readonly provinceRepo: Repository<LegacyProvince>,
    @InjectRepository(LegacyDistrict)
    private readonly districtRepo: Repository<LegacyDistrict>,
    @InjectRepository(LegacyWard)
    private readonly wardRepo: Repository<LegacyWard>,
  ) {}

  findProvinces(): Promise<LegacyProvince[]> {
    return this.provinceRepo.find({
      order: { name: 'ASC' },
      take: 200,
    });
  }

  async findProvinceByCode(
    code: string,
    options: { includeDistricts?: boolean; includeWards?: boolean } = {},
  ): Promise<LegacyProvince> {
    const province = await this.provinceRepo.findOne({
      where: { code },
      relations: options.includeDistricts
        ? options.includeWards
          ? { districts: { wards: true } }
          : { districts: true }
        : undefined,
    });

    if (!province) {
      throw new NotFoundException(`Legacy province ${code} not found`);
    }
    return province;
  }

  async findDistrictByCode(
    code: string,
    includeWards = false,
  ): Promise<LegacyDistrict> {
    const district = await this.districtRepo.findOne({
      where: { code },
      relations: includeWards
        ? { wards: true, province: true }
        : { province: true },
    });
    if (!district) {
      throw new NotFoundException(`Legacy district ${code} not found`);
    }
    return district;
  }

  findWardsByDistrict(code: string): Promise<LegacyWard[]> {
    return this.wardRepo.find({
      where: { districtCode: code },
      order: { name: 'ASC' },
      take: 500,
    });
  }

  async findWardByCode(code: string): Promise<LegacyWard> {
    const ward = await this.wardRepo.findOne({
      where: { code },
      relations: { district: true },
    });
    if (!ward) {
      throw new NotFoundException(`Legacy ward ${code} not found`);
    }
    return ward;
  }
}
