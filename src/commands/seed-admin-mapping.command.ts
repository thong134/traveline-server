import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import { AdminUnitMapping } from '../modules/vn-administrative/mapping/admin-reform-mapping.entity';
import { AdminMappingSeedItem } from '../modules/vn-administrative/mapping/admin-mapping.types';

export type SeedAdminMappingSummary = {
  inserted: number;
  errors: number;
  invalidItems: Array<{ index: number; reason: string }>;
};

@Injectable()
export class SeedAdminMappingCommand {
  private readonly logger = new Logger(SeedAdminMappingCommand.name);

  constructor(
    @InjectRepository(AdminUnitMapping)
    private readonly mappingRepository: Repository<AdminUnitMapping>,
  ) {}

  async run(filePath?: string): Promise<SeedAdminMappingSummary> {
    const summary: SeedAdminMappingSummary = {
      inserted: 0,
      errors: 0,
      invalidItems: [],
    };

    const resolvedPath = filePath ?? this.getDefaultSeedFilePath();
    this.logger.log(
      `Seeding Vietnam administrative mappings from ${resolvedPath}`,
    );

    try {
      const payload = await this.loadPayload(resolvedPath);
      const { validItems, invalidItems } = this.partitionPayload(payload);

      if (invalidItems.length) {
        summary.invalidItems.push(...invalidItems);
        summary.errors += invalidItems.length;
        invalidItems.forEach((item) =>
          this.logger.warn(
            `Skipping item #${item.index} due to ${item.reason}`,
          ),
        );
      }

      const entities = this.expandEntities(validItems);
      if (!entities.length) {
        this.logger.warn('No valid mapping entries found in the seed payload.');
      } else {
        const saved = await this.mappingRepository.save(entities, {
          chunk: 200,
        });
        summary.inserted = saved.length;
      }
    } catch (error) {
      summary.errors += 1;
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Failed to execute admin mapping seed: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    } finally {
      this.logger.log(
        `Seed admin mapping summary -> inserted=${summary.inserted}, errors=${summary.errors}`,
      );
      if (summary.invalidItems.length) {
        const invalidList = summary.invalidItems
          .map((item) => `#${item.index}: ${item.reason}`)
          .join('; ');
        this.logger.warn(`Invalid items: ${invalidList}`);
      }
    }

    return summary;
  }

  private getDefaultSeedFilePath(): string {
    return join(process.cwd(), 'src', 'data', 'admin-mapping.json');
  }

  private async loadPayload(filePath: string): Promise<unknown[]> {
    const content = await fs.readFile(filePath, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Unable to parse JSON in ${filePath}: ${(error as Error).message}`,
      );
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Seed file must be a JSON array.');
    }

    return parsed as unknown[];
  }

  private partitionPayload(payload: unknown[]) {
    const validItems: AdminMappingSeedItem[] = [];
    const invalidItems: Array<{ index: number; reason: string }> = [];

    payload.forEach((item, index) => {
      const evaluation = this.validateItem(item);
      if (evaluation.valid) {
        validItems.push(evaluation.value);
      } else {
        invalidItems.push({ index, reason: evaluation.reason });
      }
    });

    return { validItems, invalidItems };
  }

  private validateItem(
    item: unknown,
  ):
    | { valid: true; value: AdminMappingSeedItem }
    | { valid: false; reason: string } {
    if (!item || typeof item !== 'object') {
      return { valid: false, reason: 'item must be an object' };
    }

    const candidate = item as Partial<AdminMappingSeedItem>;

    if (
      !candidate.newProvinceCode ||
      typeof candidate.newProvinceCode !== 'string'
    ) {
      return {
        valid: false,
        reason: 'newProvinceCode must be a non-empty string',
      };
    }

    if (
      candidate.newCommuneCode !== undefined &&
      candidate.newCommuneCode !== null
    ) {
      if (typeof candidate.newCommuneCode !== 'string') {
        return {
          valid: false,
          reason: 'newCommuneCode must be a string or null',
        };
      }
    }

    if (!Array.isArray(candidate.old) || !candidate.old.length) {
      return { valid: false, reason: 'old must be a non-empty array' };
    }

    const invalidLegacy = candidate.old.find((legacy) => {
      if (!legacy || typeof legacy !== 'object') {
        return true;
      }
      if (!legacy.province || typeof legacy.province !== 'string') {
        return true;
      }
      if (
        legacy.district !== undefined &&
        legacy.district !== null &&
        typeof legacy.district !== 'string'
      ) {
        return true;
      }
      if (
        legacy.ward !== undefined &&
        legacy.ward !== null &&
        typeof legacy.ward !== 'string'
      ) {
        return true;
      }
      return false;
    });

    if (invalidLegacy) {
      return {
        valid: false,
        reason:
          'old entry must include province and optional district/ward strings',
      };
    }

    if (candidate.note !== undefined && candidate.note !== null) {
      if (typeof candidate.note !== 'string') {
        return { valid: false, reason: 'note must be a string or null' };
      }
    }

    if (
      candidate.resolutionRef !== undefined &&
      candidate.resolutionRef !== null
    ) {
      if (typeof candidate.resolutionRef !== 'string') {
        return {
          valid: false,
          reason: 'resolutionRef must be a string or null',
        };
      }
    }

    return { valid: true, value: candidate as AdminMappingSeedItem };
  }

  private expandEntities(items: AdminMappingSeedItem[]): AdminUnitMapping[] {
    return items.flatMap((item) => {
      const newProvinceCode = this.normalizeCode(item.newProvinceCode);
      const newCommuneCode = this.normalizeNullable(item.newCommuneCode);
      const note = this.normalizeNullable(item.note);
      const resolutionRef = this.normalizeNullable(item.resolutionRef);

      return item.old.map((legacy) =>
        this.mappingRepository.create({
          oldProvinceCode: this.normalizeCode(legacy.province),
          oldDistrictCode: this.normalizeNullable(legacy.district),
          oldWardCode: this.normalizeNullable(legacy.ward),
          newProvinceCode,
          newCommuneCode,
          note,
          resolutionRef,
        }),
      );
    });
  }

  private normalizeCode(value: string): string {
    return value.trim();
  }

  private normalizeNullable(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
}
