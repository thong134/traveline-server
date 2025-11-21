import { promises as fs } from 'fs';
import { loadLegacyDataset, buildLegacyLookup } from './data-loaders';
import { parseResolutionText } from './resolution-parser';
import { normalizeWhitespace, normalizeName } from './normalize';
import { ResolutionSource, WardRecord } from './types';

async function main() {
  const [, , clauseIndexArg, sourceIndexArg] = process.argv;
  const clauseIndex = clauseIndexArg ? Number(clauseIndexArg) : 0;
  const sourceIndex = sourceIndexArg ? Number(sourceIndexArg) : 0;

  const legacySql = await fs.readFile('scripts/migrations/ImportData_vn_units_old.sql', 'utf8');
  const resolutionText = await fs.readFile('scripts/resolutions/Cần_Thơ.txt', 'utf8');

  const dataset = loadLegacyDataset(legacySql);
  const lookup = buildLegacyLookup(dataset);
  const clauses = parseResolutionText(resolutionText, 'debug');
  const clause = clauses[clauseIndex];
  if (!clause) {
    console.error('Clause index out of bounds');
    process.exit(1);
  }
  const source = clause.from[sourceIndex];
  if (!source) {
    console.error('Source index out of bounds');
    process.exit(1);
  }

  const candidates = new Map<string, WardRecord>();
  const exactKey = normalizeWhitespace(source.name).toLowerCase();
  const exactMatches = lookup.byExactName.get(exactKey);
  if (exactMatches) {
    exactMatches.forEach((record) => candidates.set(record.code, record));
  }

  if (source.normalizedParentName) {
    const districtKey = `${source.normalizedParentName}::${source.normalizedName}`;
    const districtMatches = lookup.byDistrictName.get(districtKey);
    if (districtMatches) {
      districtMatches.forEach((record) => candidates.set(record.code, record));
    }
  }

  const typeAlias = source.type ? renderTypeAlias(source.type) : '';
  const fullNameKey = source.type ? normalizeName(`${typeAlias} ${source.name}`) : undefined;
  if (fullNameKey) {
    const byFull = lookup.byFullName.get(fullNameKey);
    if (byFull) {
      byFull.forEach((record) => candidates.set(record.code, record));
    }
  }

  const byName = lookup.byName.get(source.normalizedName);
  if (byName) {
    byName.forEach((record) => candidates.set(record.code, record));
  }

  console.log('Source:', source.raw, 'parent=', source.parentType, source.parentName);
  console.log('Candidates:', candidates.size);
  const candidateList = Array.from(candidates.values());
  candidateList.forEach((candidate) => {
    console.log(
      `- ${candidate.fullName} | district=${candidate.districtName} (${candidate.normalizedDistrictName}) | province=${candidate.provinceName} (${candidate.provinceCode}) | code=${candidate.code}`,
    );
  });

  console.log('\nFiltered candidates (mapping-resolver rules):');
  const filtered = filterCandidates(
    candidateList,
    source,
    [],
    [],
    undefined,
    undefined,
  );
  filtered.forEach((candidate) => {
    console.log(
      `* ${candidate.fullName} | district=${candidate.districtName} (${candidate.normalizedDistrictName}) | province=${candidate.provinceName} (${candidate.provinceCode}) | code=${candidate.code}`,
    );
  });
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

function filterCandidates(
  candidates: WardRecord[],
  source: ResolutionSource,
  contextRecords: WardRecord[],
  globalRecords: WardRecord[],
  provinceHint: { code?: string; normalizedName?: string } | undefined,
  recentProvinceCodes: Set<string> | undefined,
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

function parentMatches(candidate: WardRecord, unit: ResolutionSource): boolean {
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

function applyProvinceHint(records: WardRecord[], provinceHint?: { code?: string; normalizedName?: string }): WardRecord[] {
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
