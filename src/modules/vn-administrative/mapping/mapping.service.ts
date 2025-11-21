import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AdminUnitMapping } from './admin-reform-mapping.entity';
import { TranslateAddressDto } from './dto/translate-address.dto';

@Injectable()
export class AdministrativeMappingService {
  constructor(
    @InjectRepository(AdminUnitMapping)
    private readonly mappingRepo: Repository<AdminUnitMapping>,
  ) {}

  async translate(dto: TranslateAddressDto): Promise<AdminUnitMapping[]> {
    const mappings = await this.resolveMappings(dto);
    if (!mappings.length) {
      throw new NotFoundException('No mapping found for the provided address.');
    }
    return mappings;
  }

  async findByOldWard(code: string): Promise<AdminUnitMapping[]> {
    const mappings = await this.mappingRepo.find({
      where: { oldWardCode: code },
    });
    if (!mappings.length) {
      throw new NotFoundException(`No mapping found for legacy ward ${code}.`);
    }
    return mappings;
  }

  async findByNewCommune(code: string): Promise<AdminUnitMapping[]> {
    const mappings = await this.mappingRepo.find({
      where: { newCommuneCode: code },
    });
    if (!mappings.length) {
      throw new NotFoundException(
        `No mapping references reform commune ${code}.`,
      );
    }
    return mappings;
  }

  private async resolveMappings(
    dto: TranslateAddressDto,
  ): Promise<AdminUnitMapping[]> {
    const { provinceCode, districtCode, wardCode } = dto;

    if (wardCode) {
      const wardMappings = await this.mappingRepo.find({
        where: {
          oldProvinceCode: provinceCode,
          oldWardCode: wardCode,
        },
        order: { id: 'ASC' },
      });
      if (wardMappings.length) {
        return wardMappings;
      }
    }

    if (districtCode) {
      const districtMappings = await this.mappingRepo.find({
        where: {
          oldProvinceCode: provinceCode,
          oldDistrictCode: districtCode,
          oldWardCode: IsNull(),
        },
        order: { id: 'ASC' },
      });
      if (districtMappings.length) {
        return districtMappings;
      }
    }

    return this.mappingRepo.find({
      where: {
        oldProvinceCode: provinceCode,
        oldDistrictCode: IsNull(),
        oldWardCode: IsNull(),
      },
      order: { id: 'ASC' },
    });
  }

}
