import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { AdminUnitMapping } from './admin-reform-mapping.entity';
import { TranslateAddressTextDto } from './dto/translate-address-text.dto';
import { LegacyWard } from '../legacy/entities/legacy-ward.entity';
import type { LegacyDistrict } from '../legacy/entities/legacy-district.entity';
import type { LegacyProvince } from '../legacy/entities/legacy-province.entity';
import { ReformCommune } from '../reform/entities/reform-commune.entity';
import { ReformProvince } from '../reform/entities/reform-province.entity';
import { Destination } from '../../destination/entities/destinations.entity';
import { EnrichDestinationsDto } from './dto/enrich-destinations.dto';

type LegacyWardWithContext = LegacyWard & {
  district?: (LegacyDistrict & { province?: LegacyProvince | null }) | null;
};

type LegacyDistrictWithProvince =
  | (LegacyDistrict & { province?: LegacyProvince | null })
  | null
  | undefined;

type AddressSegments = {
  baseParts: string[];
  wardCandidate?: string;
  districtCandidate?: string;
};

export interface DestinationTranslationResult {
  destinationId: number;
  source: {
    province: string | null;
    specificAddress: string | null;
    baseSpecificAddress: string;
  };
  parsing: {
    wardCandidate?: string;
    existingDistrictSegment?: string | null;
  };
  legacy: {
    provinceCode: string | null;
    provinceName: string | null;
    districtCode: string | null;
    districtName: string | null;
    wardCode?: string;
    wardName?: string;
  };
  reform: {
    provinceCode: string;
    provinceName: string;
    communeCode: string;
    communeName: string;
  };
  mapping: {
    id: number;
    resolutionRef?: string | null;
    note?: string | null;
  };
  addresses: {
    legacyAddress: string;
    reformAddress: string;
    suggestedSpecificAddress: string;
    newReformAddress: string;
  };
}

type EnrichmentPreview = {
  destinationId: number;
  legacyDistrictName: string | null;
  legacyDistrictCode: string | null;
  legacyWardCode?: string;
  originalSpecificAddress: string | null;
  suggestedSpecificAddress: string;
  finalSpecificAddress: string | null;
};

type EnrichmentFailure = { destinationId: number; reason: string };

export interface DestinationsEnrichmentReport {
  dryRun: boolean;
  rewriteSpecificAddress: boolean;
  includeCompleted: boolean;
  limit?: number;
  totalCandidates: number;
  successful: number;
  updated: number;
  previews: EnrichmentPreview[];
  failures: EnrichmentFailure[];
}

@Injectable()
export class AdministrativeMappingService {
  constructor(
    @InjectRepository(AdminUnitMapping)
    private readonly mappingRepo: Repository<AdminUnitMapping>,
    @InjectRepository(LegacyWard)
    private readonly legacyWardRepo: Repository<LegacyWard>,
    @InjectRepository(ReformCommune)
    private readonly reformCommuneRepo: Repository<ReformCommune>,
    @InjectRepository(ReformProvince)
    private readonly reformProvinceRepo: Repository<ReformProvince>,
    @InjectRepository(Destination)
    private readonly destinationRepo: Repository<Destination>,
  ) {}

  private legacyWardCache?: LegacyWardWithContext[];
  private legacyWardCachePromise?: Promise<LegacyWardWithContext[]>;

  async translate(dto: TranslateAddressTextDto): Promise<{
    oldAddress: string;
    newAddress: string;
  }> {
    const { specificAddress, provinceName, wardName } = dto;
    const legacyWard = await this.findLegacyWardByName(wardName, provinceName);

    if (!legacyWard) {
      throw new NotFoundException(
        `Could not locate legacy ward "${wardName}" with the provided province context.`,
      );
    }

    const { commune, province } =
      await this.resolveMappingForLegacyWard(legacyWard);

    // FIX: Extract segments from specificAddress to avoid duplication
    const segments = await this.extractAddressSegments(specificAddress, provinceName);
    const baseSpecificAddress = this.buildBaseSpecificAddress(
      specificAddress,
      segments,
    );

    const oldAddress = [specificAddress, wardName, provinceName]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value && value.length))
      .join(', ');

    const newAddress = this.composeNewAddress(
      baseSpecificAddress,
      commune,
      province,
    );

    return { oldAddress, newAddress };
  }

  async translateDestination(
    destinationId: number,
  ): Promise<DestinationTranslationResult> {
    const destination = await this.destinationRepo.findOne({
      where: { id: destinationId },
    });

    if (!destination) {
      throw new NotFoundException(
        `Destination #${destinationId} không tồn tại`,
      );
    }

    return this.resolveDestinationTranslation(destination);
  }

  async enrichDestinations(
    dto: EnrichDestinationsDto,
  ): Promise<DestinationsEnrichmentReport> {
    const {
      dryRun = true,
      rewriteSpecificAddress = false,
      includeCompleted = false,
      limit,
    } = dto ?? {};

    const qb = this.destinationRepo.createQueryBuilder('destination');

    if (!includeCompleted) {
      qb.where(
        `(
          destination."district" IS NULL
          OR TRIM(destination."district") = ''
          OR destination."districtCode" IS NULL
          OR TRIM(destination."districtCode") = ''
        )`,
      );
    }

    qb.orderBy('destination.id', 'ASC');

    if (limit) {
      qb.take(limit);
    }

    const destinations = await qb.getMany();

    const previews: EnrichmentPreview[] = [];
    const failures: EnrichmentFailure[] = [];
    let updated = 0;

    for (const destination of destinations) {
      try {
        const analysis = await this.resolveDestinationTranslation(destination);
        const suggestedSpecificAddress =
          analysis.addresses.suggestedSpecificAddress;

        const hasExistingDistrict = Boolean(
          analysis.parsing.existingDistrictSegment &&
            this.looksLikeDistrictName(
              analysis.parsing.existingDistrictSegment ?? undefined,
            ),
        );

        const finalSpecificAddress =
          rewriteSpecificAddress && !hasExistingDistrict
            ? suggestedSpecificAddress || destination.specificAddress || null
            : (destination.specificAddress ?? null);

        const updatePayload: Partial<Destination> = {
          district: analysis.legacy.districtName ?? undefined,
          districtCode: analysis.legacy.districtCode ?? undefined,
          reformAddress: analysis.addresses.newReformAddress,
        };

        if (
          rewriteSpecificAddress &&
          !hasExistingDistrict &&
          finalSpecificAddress !== null
        ) {
          updatePayload.specificAddress = finalSpecificAddress;
        }

        previews.push({
          destinationId: destination.id,
          legacyDistrictName: analysis.legacy.districtName,
          legacyDistrictCode: analysis.legacy.districtCode,
          legacyWardCode: analysis.legacy.wardCode,
          originalSpecificAddress: destination.specificAddress ?? null,
          suggestedSpecificAddress,
          finalSpecificAddress,
        });

        if (!dryRun) {
          await this.destinationRepo.update(destination.id, updatePayload);
          updated += 1;
        }
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : 'Unknown error occurred';
        failures.push({ destinationId: destination.id, reason });
      }
    }

    return {
      dryRun,
      rewriteSpecificAddress,
      includeCompleted,
      limit,
      totalCandidates: destinations.length,
      successful: previews.length,
      updated,
      previews,
      failures,
    };
  }

  private async resolveDestinationTranslation(
    destination: Destination,
  ): Promise<DestinationTranslationResult> {
    const specificAddressRaw = destination.specificAddress?.trim() ?? '';
    if (!specificAddressRaw) {
      throw new BadRequestException(
        `Destination #${destination.id} chưa có specificAddress, không thể suy luận mã hành chính.`,
      );
    }

    const provinceRaw = destination.province?.trim();
    if (!provinceRaw) {
      throw new BadRequestException(
        `Destination #${destination.id} chưa có province, cần bổ sung để tra cứu.`,
      );
    }

    const segments = await this.extractAddressSegments(specificAddressRaw, provinceRaw);
    let wardCandidate = segments.wardCandidate?.trim();

    let legacyWard = wardCandidate
      ? await this.findLegacyWardByName(wardCandidate, provinceRaw)
      : undefined;

    // Fallback: If no ward found by segments, search whole string for a ward name
    if (!legacyWard) {
      legacyWard = await this.searchWardInString(specificAddressRaw, provinceRaw);
      if (legacyWard) {
         // If found via fallback, we need to rebuild base parts
         // This is tricky, but let's just keep the original as base for now
      }
    }

    if (!legacyWard) {
      throw new NotFoundException(
        `Không tìm thấy xã/phường hợp lệ trong "${specificAddressRaw}" (Tỉnh: ${provinceRaw}).`,
      );
    }

    const { mapping, commune, province } =
      await this.resolveMappingForLegacyWard(legacyWard);

    const baseSpecificAddress = this.buildBaseSpecificAddress(
      specificAddressRaw,
      segments,
    );

    const legacyDistrict = legacyWard.district;
    const legacyDistrictName =
      legacyDistrict?.fullName ?? legacyDistrict?.name ?? null;
    const legacyDistrictCode = legacyDistrict?.code ?? null;

    const legacyProvinceName =
      legacyDistrict?.province?.fullName ??
      legacyDistrict?.province?.name ??
      provinceRaw ??
      null;
    const legacyProvinceCode = legacyDistrict?.province?.code ?? null;

    const canonicalSpecificAddress =
      this.composeSpecificAddressWithLegacyDistrict(
        segments.baseParts,
        legacyWard,
        legacyDistrict,
      );

    const suggestedSpecificAddress = canonicalSpecificAddress.length
      ? canonicalSpecificAddress
      : specificAddressRaw;

    const legacyAddress = this.composeLegacyAddress(
      segments.baseParts,
      legacyWard,
      legacyDistrict,
      legacyProvinceName ?? provinceRaw,
    );

    const reformAddress = this.composeNewAddress(
      baseSpecificAddress,
      commune,
      province,
    );

    return {
      destinationId: destination.id,
      source: {
        province: provinceRaw ?? null,
        specificAddress: destination.specificAddress ?? null,
        baseSpecificAddress,
      },
      parsing: {
        wardCandidate,
        existingDistrictSegment: segments.districtCandidate ?? null,
      },
      legacy: {
        provinceCode: legacyProvinceCode,
        provinceName: legacyProvinceName,
        districtCode: legacyDistrictCode,
        districtName: legacyDistrictName,
        wardCode: legacyWard.code ?? undefined,
        wardName: (legacyWard.fullName ?? legacyWard.name) ?? undefined,
      },
      reform: {
        provinceCode: province.code,
        provinceName: province.fullName ?? province.name,
        communeCode: commune.code,
        communeName: commune.fullName ?? commune.name,
      },
      mapping: {
        id: mapping.id,
        resolutionRef: mapping.resolutionRef ?? null,
        note: mapping.note ?? null,
      },
      addresses: {
        legacyAddress,
        reformAddress,
        suggestedSpecificAddress,
        newReformAddress: reformAddress,
      },
    };
  }

  private async resolveMappingForLegacyWard(
    legacyWard: LegacyWardWithContext,
  ): Promise<{
    mapping: AdminUnitMapping;
    commune: ReformCommune;
    province: ReformProvince;
  }> {
    const mapping = await this.findMappingForLegacyCodes({
      wardCode: legacyWard.code,
      districtCode: legacyWard.district?.code ?? undefined,
      provinceCode: legacyWard.district?.province?.code ?? undefined,
    });

    if (!mapping) {
      throw new NotFoundException(
        `No reform mapping was registered for legacy ward code ${legacyWard.code}.`,
      );
    }

    const newCommuneCode = mapping.newCommuneCode;
    if (!newCommuneCode) {
      throw new NotFoundException(
        `Mapping ${mapping.id} does not reference a reform commune code.`,
      );
    }

    const commune = await this.reformCommuneRepo.findOne({
      where: { code: newCommuneCode },
    });

    if (!commune) {
      throw new NotFoundException(
        `Reform commune ${newCommuneCode} could not be found in the reference dataset.`,
      );
    }

    const provinceCodeToLoad = mapping.newProvinceCode ?? commune.provinceCode;

    if (!provinceCodeToLoad) {
      throw new NotFoundException(
        `No province code available for reform commune ${commune.code}.`,
      );
    }

    const province = await this.reformProvinceRepo.findOne({
      where: { code: provinceCodeToLoad },
    });

    if (!province) {
      throw new NotFoundException(
        `Reform province ${provinceCodeToLoad} not found for commune ${commune.code}.`,
      );
    }

    return { mapping, commune, province };
  }

  private async findMappingForLegacyCodes(params: {
    wardCode?: string;
    districtCode?: string;
    provinceCode?: string;
  }): Promise<AdminUnitMapping | null> {
    const { wardCode, districtCode, provinceCode } = params;

    if (wardCode) {
      const mapping = await this.mappingRepo.findOne({
        where: { oldWardCode: wardCode },
        order: { id: 'ASC' },
      });
      if (mapping) {
        return mapping;
      }
    }

    if (districtCode && provinceCode) {
      const mapping = await this.mappingRepo.findOne({
        where: {
          oldDistrictCode: districtCode,
          oldProvinceCode: provinceCode,
        },
        order: { id: 'ASC' },
      });
      if (mapping) {
        return mapping;
      }
    }

    if (provinceCode) {
      const mapping = await this.mappingRepo.findOne({
        where: { oldProvinceCode: provinceCode },
        order: { id: 'ASC' },
      });
      if (mapping) {
        return mapping;
      }
    }

    return null;
  }

  private async extractAddressSegments(
    raw: string | null,
    provinceName: string,
  ): Promise<AddressSegments> {
    if (!raw) {
      return { baseParts: [] };
    }

    const segments = raw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length);

    if (!segments.length) {
      return { baseParts: [] };
    }

    if (segments.length === 1) {
      const [single] = segments;
      if (this.looksLikeWardName(single)) {
        return { baseParts: [], wardCandidate: single };
      }
      // Check if it's a known district name in this province
      if (await this.isKnownDistrict(single, provinceName)) {
        return { baseParts: [], districtCandidate: single };
      }
      return { baseParts: segments };
    }

    const lastSegment = segments[segments.length - 1];

    // Priority 1: Last segment is a District
    if (this.looksLikeDistrictName(lastSegment) || await this.isKnownDistrict(lastSegment, provinceName)) {
      const wardCandidate = segments.length >= 2 ? segments[segments.length - 2] : undefined;
      const baseParts = wardCandidate ? segments.slice(0, -2) : segments.slice(0, -1);
      return {
        baseParts,
        wardCandidate,
        districtCandidate: lastSegment,
      };
    }

    // Priority 2: Last segment is a Ward
    const wardCandidate = segments[segments.length - 1];
    const baseParts = segments.slice(0, -1);

    return { baseParts, wardCandidate };
  }

  private buildBaseSpecificAddress(
    specificAddress: string,
    segments: AddressSegments,
  ): string {
    if (segments.baseParts.length) {
      return segments.baseParts.join(', ');
    }

    const trimmed = specificAddress.trim();
    if (!trimmed.length) {
      return '';
    }

    if (segments.wardCandidate) {
      const suffix = `, ${segments.wardCandidate}`;
      if (trimmed.endsWith(suffix)) {
        return trimmed.slice(0, -suffix.length).trim();
      }
      if (trimmed === segments.wardCandidate) {
        return '';
      }
    }

    if (segments.districtCandidate) {
      const suffix = `, ${segments.districtCandidate}`;
      if (trimmed.endsWith(suffix)) {
        return trimmed.slice(0, -suffix.length).trim();
      }
    }

    return trimmed;
  }

  private composeSpecificAddressWithLegacyDistrict(
    baseParts: string[],
    ward: LegacyWardWithContext,
    district: LegacyDistrictWithProvince,
  ): string {
    const components = [...baseParts, ward.fullName ?? ward.name];

    const districtName = district?.fullName ?? district?.name;
    if (districtName) {
      components.push(districtName);
    }

    return components
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value && value.length))
      .join(', ');
  }

  private composeLegacyAddress(
    baseParts: string[],
    ward: LegacyWardWithContext,
    district: LegacyDistrictWithProvince,
    provinceName?: string | null,
  ): string {
    const components = [...baseParts, ward.fullName ?? ward.name];

    const districtName = district?.fullName ?? district?.name;
    if (districtName) {
      components.push(districtName);
    }

    const provinceDisplay =
      provinceName?.trim() ||
      district?.province?.fullName ||
      district?.province?.name;

    if (provinceDisplay) {
      components.push(provinceDisplay);
    }

    return components
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value && value.length))
      .join(', ');
  }

  private looksLikeDistrictName(value?: string | null): boolean {
    const normalized = this.normalizeText(value);
    if (!normalized) {
      return false;
    }

    return /\b(quan|huyen|thi xa|tp|thanh pho)\b/.test(normalized);
  }

  private looksLikeWardName(value?: string | null): boolean {
    const normalized = this.normalizeText(value);
    if (!normalized) {
      return false;
    }

    return /\b(phuong|xa|commune|ward|thi tran)\b/.test(normalized);
  }

  private async isKnownDistrict(name: string, provinceName: string): Promise<boolean> {
    const normalizedName = this.normalizeText(name);
    const normalizedProvince = this.normalizeText(provinceName);
    const wards = await this.ensureLegacyWardCache();
    
    return wards.some(w => 
      this.normalizeText(w.district?.province?.name) === normalizedProvince &&
      (this.normalizeText(w.district?.name) === normalizedName || 
       this.normalizeText(w.district?.fullName) === normalizedName)
    );
  }

  private async searchWardInString(text: string, provinceName: string): Promise<LegacyWardWithContext | undefined> {
    const normalizedText = this.normalizeText(text);
    const normalizedProvince = this.normalizeText(provinceName);
    const wards = await this.ensureLegacyWardCache();

    // Filter wards by province first
    const provinceWards = wards.filter(w => 
      this.normalizeText(w.district?.province?.name) === normalizedProvince ||
      this.normalizeText(w.district?.province?.fullName) === normalizedProvince
    );

    // Sort by name length descending to match longest name first (e.g. "Hòa Hiệp Bắc" before "Hòa Hiệp")
    provinceWards.sort((a, b) => (b.fullName || b.name).length - (a.fullName || a.name).length);

    for (const ward of provinceWards) {
      const names = [
        this.normalizeText(ward.fullName),
        this.normalizeText(ward.name)
      ].filter(n => n.length > 2); // Avoid matching too short names

      if (names.some(n => normalizedText.includes(n))) {
        return ward;
      }
    }
    
    return undefined;
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

  private normalizeText(value?: string | null): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  private async ensureLegacyWardCache(): Promise<LegacyWardWithContext[]> {
    if (this.legacyWardCache) {
      return this.legacyWardCache;
    }

    if (!this.legacyWardCachePromise) {
      this.legacyWardCachePromise = this.legacyWardRepo
        .createQueryBuilder('ward')
        .leftJoinAndSelect('ward.district', 'district')
        .leftJoinAndSelect('district.province', 'province')
        .getMany()
        .then((wards) => {
          this.legacyWardCache = wards;
          this.legacyWardCachePromise = undefined;
          return wards;
        })
        .catch((error) => {
          this.legacyWardCachePromise = undefined;
          if (error instanceof QueryFailedError) {
            const driverError = error.driverError as { code?: string };
            if (driverError?.code === '42P01') {
              throw new InternalServerErrorException(
                'Legacy administrative dataset (vn_legacy.wards) is not available. Please import the legacy units dataset before using the translate endpoint.',
              );
            }
          }
          throw error;
        });
    }

    return this.legacyWardCachePromise;
  }

  private async findLegacyWardByName(
    wardName: string,
    provinceName: string,
  ): Promise<LegacyWardWithContext | undefined> {
    // Match the legacy ward name using accent-insensitive comparisons scoped by the legacy province name where available.
    const normalizedWard = this.normalizeText(wardName);
    const trimmedProvince = (provinceName ?? '').trim();
    const provinceCodeCandidate = trimmedProvince.match(/\d+/)?.[0];
    const provinceForNameRaw = provinceCodeCandidate
      ? trimmedProvince.replace(provinceCodeCandidate, '').trim()
      : trimmedProvince;
    const provinceForName = provinceForNameRaw.replace(/[-/]/g, ' ');
    const normalizedProvince = this.normalizeText(provinceForName);

    const wards = await this.ensureLegacyWardCache();

    const matchesByName = wards.filter((ward) => {
      const names = [
        this.normalizeText(ward.name),
        this.normalizeText(ward.fullName ?? ''),
      ];
      return names.some((candidate) => candidate === normalizedWard);
    });

    let candidates = matchesByName.length
      ? matchesByName
      : wards.filter((ward) => {
          const names = [
            this.normalizeText(ward.name),
            this.normalizeText(ward.fullName ?? ''),
          ];
          return names.some((candidate) => candidate.includes(normalizedWard));
        });

    if (!candidates.length) {
      return undefined;
    }

    if (provinceCodeCandidate) {
      const byProvinceCode = candidates.filter(
        (ward) => ward.district?.province?.code === provinceCodeCandidate,
      );
      if (byProvinceCode.length) {
        candidates = byProvinceCode;
      }
    }

    if (normalizedProvince) {
      const byProvince = candidates.filter((ward) => {
        const provinceNames = [
          this.normalizeText(ward.district?.province?.name ?? ''),
          this.normalizeText(ward.district?.province?.fullName ?? ''),
        ];
        return provinceNames.some((name) => name === normalizedProvince);
      });
      if (byProvince.length) {
        candidates = byProvince;
      }
    }

    return candidates[0];
  }

  private composeNewAddress(
    specificAddress: string,
    commune: ReformCommune,
    province: ReformProvince,
  ): string {
    // Keep the free-form part intact and append the reform administrative hierarchy.
    const components = [
      specificAddress ?? '',
      commune.fullName ?? commune.name,
      province.fullName ?? province.name,
    ].filter((part): part is string => Boolean(part && part.length));

    return components.join(', ');
  }
}
