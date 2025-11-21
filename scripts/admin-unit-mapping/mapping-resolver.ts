import { normalizeName, normalizeWhitespace } from './normalize';
import {
  LegacyLookup,
  ReformLookup,
  MappingRow,
  ResolutionClause,
  ResolutionSource,
  WardRecord,
} from './types';

export interface ProvinceHint {
  code?: string;
  normalizedName?: string;
}

export interface ProvinceHints {
  legacy?: ProvinceHint;
  reform?: ProvinceHint;
}

interface ResolveContext {
  legacyLookup: LegacyLookup;
  reformLookup: ReformLookup;
  provinceHints?: ProvinceHints;
}

export function resolveClausesToMappings(clauses: ResolutionClause[], context: ResolveContext): MappingRow[] {
  const rows: MappingRow[] = [];
  const globalLegacyRecords: WardRecord[] = [];
  let recentProvinceCodes: Set<string> | undefined;

  clauses.forEach((clause) => {
    const legacyRecords: WardRecord[] = [];
    clause.from.forEach((source) => {
      const record = findLegacySource(
        source,
        context.legacyLookup,
        legacyRecords,
        globalLegacyRecords,
        context.provinceHints?.legacy,
        recentProvinceCodes,
      );
      legacyRecords.push(record);
    });
    const targetRecord = findReformTarget(
      clause.to,
      context.reformLookup,
      legacyRecords,
      context.provinceHints?.reform,
    );

    legacyRecords.forEach((legacyRecord) => {
      rows.push({
        oldProvinceCode: legacyRecord.provinceCode,
        oldDistrictCode: legacyRecord.districtCode,
        oldWardCode: legacyRecord.code,
        newProvinceCode: targetRecord.provinceCode,
        newCommuneCode: targetRecord.code,
        note: clause.note,
        resolutionRef: clause.resolutionRef,
      });
    });

    globalLegacyRecords.push(...legacyRecords);
    recentProvinceCodes = new Set(legacyRecords.map((record) => record.provinceCode));
  });

  return rows;
}

function findLegacySource(
  source: ResolutionSource,
  lookup: LegacyLookup,
  contextRecords: WardRecord[] = [],
  globalRecords: WardRecord[] = [],
  provinceHint?: ProvinceHint,
  recentProvinceCodes?: Set<string>,
): WardRecord {
  const normalizedFullName = source.type ? normalizeName(`${renderTypeAlias(source.type)} ${source.name}`) : undefined;

  const candidates = new Map<string, WardRecord>();
  const exactKey = normalizeWhitespace(source.name).toLowerCase();
  const exactMatches = lookup.byExactName.get(exactKey);
  collectCandidates(exactMatches, candidates);

  if (source.normalizedParentName) {
    const districtKey = makeDistrictKey(source.normalizedParentName, source.normalizedName);
    collectCandidates(lookup.byDistrictName.get(districtKey), candidates);
  }

  let usedFallback = false;

  while (true) {
    const filtered = filterCandidates(
      Array.from(candidates.values()),
      source,
      contextRecords,
      globalRecords,
      provinceHint,
      recentProvinceCodes,
    );

    if (filtered.length === 1) {
      return filtered[0];
    }

    if (usedFallback) {
      if (filtered.length === 0) {
        throw new Error(`Legacy unit not found for "${source.raw}".`);
      }
      const detail = filtered
        .map((candidate) => `${candidate.fullName} (${candidate.districtName}, ${candidate.provinceName})`)
        .join('; ');
      throw new Error(`Ambiguous legacy unit for "${source.raw}": ${detail}`);
    }

    usedFallback = true;

    if (normalizedFullName) {
      collectCandidates(lookup.byFullName.get(normalizedFullName), candidates);
    }
    collectCandidates(lookup.byName.get(source.normalizedName), candidates);

    if (source.normalizedParentName) {
      const fallbackDistrictKey = makeDistrictKey(source.normalizedParentName, source.normalizedName);
      collectCandidates(lookup.byDistrictName.get(fallbackDistrictKey), candidates);
    }
  }
}

function filterCandidates(
  candidates: WardRecord[],
  source: ResolutionSource,
  contextRecords: WardRecord[],
  globalRecords: WardRecord[],
  provinceHint?: ProvinceHint,
  recentProvinceCodes?: Set<string>,
): WardRecord[] {
  let filtered = candidates;

  if (source.type) {
    filtered = filtered.filter((candidate) => candidate.administrativeKind === source.type);
  }

  if (source.parentType && source.normalizedParentName) {
    filtered = filtered.filter((candidate) => parentMatches(candidate, source));
  }

  filtered = applyProvincePreference(filtered, recentProvinceCodes);
  filtered = applyProvinceHint(filtered, provinceHint);

  const combinedContext = contextRecords.length > 0 || globalRecords.length > 0 ? [...contextRecords, ...globalRecords] : [];

  if (combinedContext.length > 0) {
    const provinceCodes = new Set(combinedContext.map((record) => record.provinceCode));
    const provinceNames = new Set(combinedContext.map((record) => record.normalizedProvinceName));
    if (provinceHint?.code) {
      provinceCodes.add(provinceHint.code);
    }
    if (provinceHint?.normalizedName) {
      provinceNames.add(provinceHint.normalizedName);
    }
    const narrowedByProvince = filtered.filter(
      (candidate) => provinceCodes.has(candidate.provinceCode) || provinceNames.has(candidate.normalizedProvinceName),
    );

    if (narrowedByProvince.length > 0) {
      filtered = narrowedByProvince;
    }

    if (filtered.length > 1) {
      const districtCodes = new Set(combinedContext.map((record) => record.districtCode).filter(Boolean));
      const districtNames = new Set(combinedContext.map((record) => record.normalizedDistrictName).filter(Boolean));

      if (districtCodes.size > 0 || districtNames.size > 0) {
        const narrowedByDistrict = filtered.filter((candidate) => {
          const candidateHasDistrict = Boolean(candidate.districtCode || candidate.normalizedDistrictName);
          if (!candidateHasDistrict) {
            return true;
          }
          return districtCodes.has(candidate.districtCode) || districtNames.has(candidate.normalizedDistrictName);
        });

        if (narrowedByDistrict.length > 0) {
          filtered = narrowedByDistrict;
        }
      }
    }
  }

  return filtered;
}

function findReformTarget(
  target: ResolutionClause['to'],
  lookup: ReformLookup,
  sources?: WardRecord[],
  provinceHint?: ProvinceHint,
): WardRecord {
  const normalizedFullName = target.type ? normalizeName(`${renderTypeAlias(target.type)} ${target.name}`) : undefined;
  const byFull = normalizedFullName ? lookup.byFullName.get(normalizedFullName) : undefined;
  const byName = lookup.byName.get(target.normalizedName);

  const candidates = new Map<string, WardRecord>();
  collectCandidates(byFull, candidates);
  collectCandidates(byName, candidates);

  if (target.parentType && target.normalizedParentName) {
    const filtered = Array.from(candidates.values()).filter((candidate) => parentMatches(candidate, target));
    filtered.forEach((candidate) => candidates.set(candidate.code, candidate));
  }

  let resolved = Array.from(candidates.values());

  resolved = applyProvinceHint(resolved, provinceHint);

  if (sources && sources.length > 0) {
    const provinceCodes = new Set(sources.map((record) => record.provinceCode));
    const provinceNames = new Set(sources.map((record) => record.normalizedProvinceName));
    if (provinceHint?.code) {
      provinceCodes.add(provinceHint.code);
    }
    if (provinceHint?.normalizedName) {
      provinceNames.add(provinceHint.normalizedName);
    }
    const narrowedByProvince = resolved.filter(
      (candidate) => provinceCodes.has(candidate.provinceCode) || provinceNames.has(candidate.normalizedProvinceName),
    );

    if (narrowedByProvince.length > 0) {
      resolved = narrowedByProvince;
    }

    if (resolved.length > 1) {
      const districtCodes = new Set(sources.map((record) => record.districtCode).filter(Boolean));
      const districtNames = new Set(sources.map((record) => record.normalizedDistrictName).filter(Boolean));

      if (districtCodes.size > 0 || districtNames.size > 0) {
        const narrowedByDistrict = resolved.filter((candidate) => {
          const candidateHasDistrict = Boolean(candidate.districtCode || candidate.normalizedDistrictName);
          if (!candidateHasDistrict) {
            return true;
          }
          return districtCodes.has(candidate.districtCode) || districtNames.has(candidate.normalizedDistrictName);
        });

        if (narrowedByDistrict.length > 0) {
          resolved = narrowedByDistrict;
        }
      }
    }
  }

  if (resolved.length === 0) {
    throw new Error(`Reform unit not found for "${target.raw}".`);
  }

  if (resolved.length > 1) {
    const detail = resolved.map((candidate) => `${candidate.fullName} (${candidate.provinceName})`).join('; ');
    throw new Error(`Ambiguous reform unit for "${target.raw}": ${detail}`);
  }

  return resolved[0];
}

function collectCandidates(records: WardRecord[] | undefined, accumulator: Map<string, WardRecord>): void {
  if (!records) {
    return;
  }
  records.forEach((record) => accumulator.set(record.code, record));
}

function applyProvinceHint(records: WardRecord[], provinceHint?: ProvinceHint): WardRecord[] {
  if (!provinceHint || records.length <= 1) {
    return records;
  }

  const { code, normalizedName } = provinceHint;
  if (!code && !normalizedName) {
    return records;
  }

  const narrowed = records.filter((candidate) => {
    const matchesCode = code ? candidate.provinceCode === code : false;
    const matchesName = normalizedName ? candidate.normalizedProvinceName === normalizedName : false;
    return matchesCode || matchesName;
  });

  return narrowed.length > 0 ? narrowed : records;
}

function parentMatches(candidate: WardRecord, unit: ResolutionSource | ResolutionClause['to']): boolean {
  if (!unit.parentType || !unit.normalizedParentName) {
    return true;
  }

  const normalizedParentName = unit.normalizedParentName;
  switch (unit.parentType) {
    case 'huyen':
    case 'thi_xa':
    case 'quan':
    case 'thanh_pho':
      return matchesAdministrativeName(candidate.normalizedDistrictName, normalizedParentName);
    case 'tinh':
      return matchesAdministrativeName(candidate.normalizedProvinceName, normalizedParentName);
    default:
      return (
        matchesAdministrativeName(candidate.normalizedDistrictName, normalizedParentName) ||
        matchesAdministrativeName(candidate.normalizedProvinceName, normalizedParentName)
      );
  }
}

function makeDistrictKey(district: string, name: string): string {
  return `${district}::${name}`;
}

function renderTypeAlias(kind: ResolutionSource['type']): string {
  switch (kind) {
    case 'thi_tran':
      return 'thị trấn';
    case 'thi_xa':
      return 'thị xã';
    case 'xa':
      return 'xã';
    case 'phuong':
      return 'phường';
    case 'quan':
      return 'quận';
    case 'huyen':
      return 'huyện';
    case 'thanh_pho':
      return 'thành phố';
    default:
      return '';
  }
}

function matchesAdministrativeName(value: string | undefined, parentName: string): boolean {
  if (!value) {
    return false;
  }
  if (value === parentName) {
    return true;
  }
  return stripAdministrativePrefixes(value) === parentName;
}

function stripAdministrativePrefixes(value: string): string {
  const ADMIN_PREFIX_REGEX = /^(thanh pho|tinh|quan|huyen|thi xa|thi tran|phuong|xa)\s+/;
  let result = value;
  let iterations = 0;
  while (ADMIN_PREFIX_REGEX.test(result) && iterations < 5) {
    result = result.replace(ADMIN_PREFIX_REGEX, '').trim();
    iterations += 1;
  }
  return result;
}

function applyProvincePreference(records: WardRecord[], preferredCodes?: Set<string>): WardRecord[] {
  if (!preferredCodes || preferredCodes.size === 0 || records.length <= 1) {
    return records;
  }

  const narrowed = records.filter((record) => preferredCodes.has(record.provinceCode));
  return narrowed.length > 0 ? narrowed : records;
}
