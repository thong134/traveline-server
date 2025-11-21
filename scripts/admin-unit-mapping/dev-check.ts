import { promises as fs } from 'fs';
import { loadLegacyDataset, buildLegacyLookup } from './data-loaders';
import { parseResolutionText } from './resolution-parser';
import { normalizeName, normalizeWhitespace, stripToneMarks } from './normalize';
import { LegacyLookup, ResolutionSource, WardRecord } from './types';

async function main() {
  const sql = await fs.readFile('scripts/migrations/ImportData_vn_units_old.sql', 'utf8');
  const dataset = loadLegacyDataset(sql);
  const lookup = buildLegacyLookup(dataset);
  const key = 'hoa lac';
  const entries = lookup.byName.get(key) ?? [];
  console.log('Entries for', key, entries.map((item) => `${item.fullName} (${item.districtName}, ${item.provinceName})`));

  const fromResolution = 'Hòa Lạc';
  const legacyName = 'Hoà Lạc';
  console.log('Resolution raw', fromResolution, fromResolution.normalize('NFD'));
  console.log('Legacy raw', legacyName, legacyName.normalize('NFD'));
  const normalizedResolution = fromResolution.normalize('NFD').normalize();
  const normalizedLegacy = legacyName.normalize('NFD').normalize();
  console.log('Normalized forms', normalizedResolution, normalizedLegacy);
  console.log('Equality check direct', String(fromResolution) === String(legacyName));
  console.log('Tone test', stripToneMarks('Phú Thạnh'), stripToneMarks('Phú Thành'));
  console.log('Phu Thanh NFD', Array.from('Phú Thạnh'.normalize('NFD')).map((char) => char.charCodeAt(0).toString(16)));
  console.log('Phu Thanh alt NFD', Array.from('Phú Thành'.normalize('NFD')).map((char) => char.charCodeAt(0).toString(16)));

  const resolutionText = await fs.readFile('scripts/resolutions/An_Giang.txt', 'utf8');
  const clauses = parseResolutionText(resolutionText, 'QA/2023');
  const globalRecords: WardRecord[] = [];

  clauses.slice(0, 13).forEach((clause, clauseIndex) => {
    const legacyRecords: WardRecord[] = [];
    clause.from.forEach((source) => {
      const record = debugFindLegacySource(clauseIndex, source, lookup, legacyRecords, globalRecords);
      legacyRecords.push(record);
    });
    globalRecords.push(...legacyRecords);
  });
}

function debugFindLegacySource(
  clauseIndex: number,
  source: ResolutionSource,
  lookup: LegacyLookup,
  contextRecords: WardRecord[] = [],
  globalRecords: WardRecord[] = [],
): WardRecord {
  const logPrefix = `clause ${clauseIndex + 1} :: ${source.raw}`;
  const normalizedFullName = source.type ? normalizeName(`${renderTypeAlias(source.type)} ${source.name}`) : undefined;
  const candidates = new Map<string, WardRecord>();
  const exactKey = normalizeWhitespace(source.name).toLowerCase();
  const exactMatches = lookup.byExactName.get(exactKey);
  const hasExactMatches = Boolean(exactMatches && exactMatches.length > 0);
  if (hasExactMatches) {
    collectCandidates(exactMatches, candidates);
  }

  if (!hasExactMatches || (exactMatches && exactMatches.length > 1)) {
    if (normalizedFullName) {
      collectCandidates(lookup.byFullName.get(normalizedFullName), candidates);
    }
    const nameCandidates = lookup.byName.get(source.normalizedName);
    if (source.normalizedName === 'hoa lac') {
      console.log(logPrefix, 'lookup.byName size', nameCandidates?.length);
      console.log(logPrefix, 'lookup.byName sample', nameCandidates?.map(renderCandidate));
    }
    collectCandidates(nameCandidates, candidates);

    if (hasExactMatches && exactMatches && exactMatches.length > 1) {
      const toneNormalizedSource = normalizeWhitespace(stripToneMarks(source.name)).toLowerCase();
      Array.from(candidates.values()).forEach((candidate) => {
        const candidateToneNormalized = normalizeWhitespace(stripToneMarks(candidate.name)).toLowerCase();
        if (candidateToneNormalized !== toneNormalizedSource) {
          candidates.delete(candidate.code);
        }
      });
    }
  }

  if (source.normalizedParentName) {
    const districtKey = makeDistrictKey(source.normalizedParentName, source.normalizedName);
    collectCandidates(lookup.byDistrictName.get(districtKey), candidates);
  }

  if (source.normalizedName === 'hoa lac') {
    console.log(logPrefix, 'initial candidates', Array.from(candidates.values()).map(renderCandidate));
  }

  let filtered = Array.from(candidates.values());

  if (source.type) {
    filtered = filtered.filter((candidate) => candidate.administrativeKind === source.type);
  }

  if (source.normalizedName === 'hoa lac') {
    console.log(logPrefix, 'after type filter', filtered.map(renderCandidate));
  }

  if (source.parentType && source.normalizedParentName) {
    filtered = filtered.filter((candidate) => parentMatches(candidate, source));
  }

  const combinedContext = contextRecords.length > 0 || globalRecords.length > 0 ? [...contextRecords, ...globalRecords] : [];

  if (combinedContext.length > 0) {
    const provinceCodes = new Set(combinedContext.map((record) => record.provinceCode));
    const provinceNames = new Set(combinedContext.map((record) => record.normalizedProvinceName));
    const narrowedByProvince = filtered.filter(
      (candidate) => provinceCodes.has(candidate.provinceCode) || provinceNames.has(candidate.normalizedProvinceName),
    );

    if (source.normalizedName === 'hoa lac') {
      console.log(logPrefix, 'province context', Array.from(provinceCodes), Array.from(provinceNames));
      console.log(logPrefix, 'after province filter', narrowedByProvince.map(renderCandidate));
    }

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

        if (source.normalizedName === 'hoa lac') {
          console.log(logPrefix, 'district context', Array.from(districtCodes), Array.from(districtNames));
          console.log(logPrefix, 'after district filter', narrowedByDistrict.map(renderCandidate));
        }

        if (narrowedByDistrict.length > 0) {
          filtered = narrowedByDistrict;
        }
      }
    }
  }

  if (filtered.length !== 1) {
    const detail = filtered.map(renderCandidate).join('; ');
    throw new Error(`Ambiguous result for ${source.raw}: ${detail}`);
  }

  const result = filtered[0];
  if (source.normalizedName === 'hoa lac') {
    console.log(logPrefix, 'resolved to', renderCandidate(result));
  }
  return result;
}

function collectCandidates(records: WardRecord[] | undefined, accumulator: Map<string, WardRecord>): void {
  if (!records) {
    return;
  }
  records.forEach((record) => accumulator.set(record.code, record));
}

function parentMatches(candidate: WardRecord, unit: ResolutionSource): boolean {
  if (!unit.parentType || !unit.normalizedParentName) {
    return true;
  }

  switch (unit.parentType) {
    case 'huyen':
    case 'thi_xa':
    case 'quan':
      return candidate.normalizedDistrictName === unit.normalizedParentName;
    case 'thanh_pho':
    case 'tinh':
      return candidate.normalizedProvinceName === unit.normalizedParentName;
    default:
      return true;
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

function renderCandidate(candidate: WardRecord): string {
  return `${candidate.fullName} (${candidate.districtName}, ${candidate.provinceName})`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
