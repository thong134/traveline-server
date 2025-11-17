import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUnitMapping } from './admin-reform-mapping.entity';
import { TranslateAddressDto } from './dto/translate-address.dto';
import { LegacyProvince } from '../legacy/entities/legacy-province.entity';
import { LegacyDistrict } from '../legacy/entities/legacy-district.entity';
import { LegacyWard } from '../legacy/entities/legacy-ward.entity';
import { ReformProvince } from '../reform/entities/reform-province.entity';
import { ReformCommune } from '../reform/entities/reform-commune.entity';

export type AddressTranslation = {
  mapping: AdminUnitMapping;
  old: {
    province?: LegacyProvince | null;
    district?: LegacyDistrict | null;
    ward?: LegacyWard | null;
  };
  reform: {
    province?: ReformProvince | null;
    commune?: ReformCommune | null;
  };
};

@Injectable()
export class AdministrativeMappingService {
  constructor(
    @InjectRepository(AdminUnitMapping)
    private readonly mappingRepo: Repository<AdminUnitMapping>,
    @InjectRepository(LegacyProvince)
    private readonly legacyProvinceRepo: Repository<LegacyProvince>,
    @InjectRepository(LegacyDistrict)
    private readonly legacyDistrictRepo: Repository<LegacyDistrict>,
    @InjectRepository(LegacyWard)
    private readonly legacyWardRepo: Repository<LegacyWard>,
    @InjectRepository(ReformProvince)
    private readonly reformProvinceRepo: Repository<ReformProvince>,
    @InjectRepository(ReformCommune)
    private readonly reformCommuneRepo: Repository<ReformCommune>,
  ) {}

  async translate(dto: TranslateAddressDto): Promise<AddressTranslation[]> {
    const mappings = await this.resolveMappings(dto);
    if (!mappings.length) {
      throw new NotFoundException('No mapping found for the provided address.');
    }
    return Promise.all(mappings.map((mapping) => this.enrichMapping(mapping)));
  }

  async findByOldWard(code: string): Promise<AddressTranslation[]> {
    const mappings = await this.mappingRepo.find({
      where: { oldWardCode: code },
    });
    if (!mappings.length) {
      throw new NotFoundException(`No mapping found for legacy ward ${code}.`);
    }
    return Promise.all(mappings.map((mapping) => this.enrichMapping(mapping)));
  }

  async findByNewCommune(code: string): Promise<AddressTranslation[]> {
    const mappings = await this.mappingRepo.find({
      where: { newCommuneCode: code },
    });
    if (!mappings.length) {
      throw new NotFoundException(
        `No mapping references reform commune ${code}.`,
      );
    }
    return Promise.all(mappings.map((mapping) => this.enrichMapping(mapping)));
  }

  private async resolveMappings(
    dto: TranslateAddressDto,
  ): Promise<AdminUnitMapping[]> {
    const { provinceCode, districtCode, wardCode } = dto;
    const qb = this.mappingRepo.createQueryBuilder('mapping');
    qb.where('mapping.old_province_code = :provinceCode', { provinceCode });

    if (wardCode) {
      qb.andWhere('mapping.old_ward_code = :wardCode', { wardCode });
    } else if (districtCode) {
      qb.andWhere('mapping.old_district_code = :districtCode', {
        districtCode,
      });
      qb.andWhere('mapping.old_ward_code IS NULL');
    } else {
      qb.andWhere('mapping.old_district_code IS NULL');
      qb.andWhere('mapping.old_ward_code IS NULL');
    }

    qb.orderBy('mapping.id', 'ASC');
    return qb.getMany();
  }

  private async enrichMapping(
    mapping: AdminUnitMapping,
  ): Promise<AddressTranslation> {
    const [oldProvince, oldDistrict, oldWard, newProvince, newCommune] =
      await Promise.all([
        this.fetchLegacyProvince(mapping.oldProvinceCode),
        this.fetchLegacyDistrict(mapping.oldDistrictCode),
        this.fetchLegacyWard(mapping.oldWardCode),
        this.fetchReformProvince(mapping.newProvinceCode),
        this.fetchReformCommune(mapping.newCommuneCode),
      ]);

    return {
      mapping,
      old: {
        province: oldProvince,
        district: oldDistrict,
        ward: oldWard,
      },
      reform: {
        province: newProvince,
        commune: newCommune,
      },
    };
  }

  private fetchLegacyProvince(code?: string | null) {
    return code
      ? this.legacyProvinceRepo.findOne({ where: { code } })
      : Promise.resolve(null);
  }

  private fetchLegacyDistrict(code?: string | null) {
    return code
      ? this.legacyDistrictRepo.findOne({ where: { code } })
      : Promise.resolve(null);
  }

  private fetchLegacyWard(code?: string | null) {
    return code
      ? this.legacyWardRepo.findOne({ where: { code } })
      : Promise.resolve(null);
  }

  private fetchReformProvince(code?: string | null) {
    return code
      ? this.reformProvinceRepo.findOne({ where: { code } })
      : Promise.resolve(null);
  }

  private fetchReformCommune(code?: string | null) {
    return code
      ? this.reformCommuneRepo.findOne({ where: { code } })
      : Promise.resolve(null);
  }
}
