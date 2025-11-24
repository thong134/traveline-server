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
    const orderedSources = orderSourcesForResolution(clause.from, context.legacyLookup);
    const pendingSources = [...orderedSources];

    while (pendingSources.length > 0) {
      let resolvedInPass = false;
      let deferredError: Error | undefined;

      for (let index = 0; index < pendingSources.length; index += 1) {
        const source = pendingSources[index];

        try {
          const record = findLegacySource(
            source,
            context.legacyLookup,
            legacyRecords,
            globalLegacyRecords,
            context.provinceHints?.legacy,
            recentProvinceCodes,
          );
          legacyRecords.push(record);
          pendingSources.splice(index, 1);
          index -= 1;
          resolvedInPass = true;
        } catch (error) {
          if (isAmbiguousLegacyError(error)) {
            deferredError = error as Error;
            continue;
          }
          throw error;
        }
      }

      if (!resolvedInPass) {
        if (deferredError && isAmbiguousLegacyError(deferredError)) {
          const combination = resolveAmbiguousSources(
            pendingSources,
            context.legacyLookup,
            legacyRecords,
            globalLegacyRecords,
            context.provinceHints?.legacy,
            recentProvinceCodes,
          );

          if (combination) {
            combination.forEach((record) => {
              legacyRecords.push(record);
            });
            pendingSources.length = 0;
            break;
          }
        }

        if (deferredError) {
          throw deferredError;
        }

        throw new Error(`Unable to resolve clause: ${clause.note}`);
      }
    }

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

function isAmbiguousLegacyError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.startsWith('Ambiguous legacy unit');
}

interface SourceResolutionPriority {
  source: ResolutionSource;
  parentPriority: number;
  typePriority: number;
  candidateCount: number;
  index: number;
}

function orderSourcesForResolution(sources: ResolutionSource[], lookup: LegacyLookup): ResolutionSource[] {
  const priorities: SourceResolutionPriority[] = sources.map((source, index) => {
    const parentPriority = source.parentName ? 0 : 1;
    const typePriority = source.type ? 0 : 1;
    const candidateCount = estimateCandidateCount(source, lookup) || Number.MAX_SAFE_INTEGER;

    return {
      source,
      parentPriority,
      typePriority,
      candidateCount,
      index,
    };
  });

  priorities.sort((a, b) => {
    if (a.parentPriority !== b.parentPriority) {
      return a.parentPriority - b.parentPriority;
    }
    if (a.candidateCount !== b.candidateCount) {
      return a.candidateCount - b.candidateCount;
    }
    if (a.typePriority !== b.typePriority) {
      return a.typePriority - b.typePriority;
    }
    return a.index - b.index;
  });

  return priorities.map((entry) => entry.source);
}

function estimateCandidateCount(source: ResolutionSource, lookup: LegacyLookup): number {
  const candidates = new Map<string, WardRecord>();
  const exactKey = normalizeWhitespace(source.name).toLowerCase();
  collectCandidates(lookup.byExactName.get(exactKey), candidates);

  if (source.type) {
    const normalizedFullName = normalizeName(`${renderTypeAlias(source.type)} ${source.name}`);
    collectCandidates(lookup.byFullName.get(normalizedFullName), candidates);
  }

  collectCandidates(lookup.byName.get(source.normalizedName), candidates);

  if (source.normalizedParentName) {
    const districtKey = makeDistrictKey(source.normalizedParentName, source.normalizedName);
    collectCandidates(lookup.byDistrictName.get(districtKey), candidates);
  }

  return candidates.size;
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
  collectCandidates(exactMatches, candidates, provinceHint);

  if (source.normalizedParentName) {
    const districtKey = makeDistrictKey(source.normalizedParentName, source.normalizedName);
    collectCandidates(lookup.byDistrictName.get(districtKey), candidates, provinceHint);
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
      collectCandidates(lookup.byFullName.get(normalizedFullName), candidates, provinceHint);
    }
    collectCandidates(lookup.byName.get(source.normalizedName), candidates, provinceHint);

    if (source.normalizedParentName) {
      const fallbackDistrictKey = makeDistrictKey(source.normalizedParentName, source.normalizedName);
      collectCandidates(lookup.byDistrictName.get(fallbackDistrictKey), candidates, provinceHint);
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

  let beforeParentFilter = filtered;
  if (source.parentType && source.normalizedParentName) {
    filtered = filtered.filter((candidate) => parentMatches(candidate, source));
    if (filtered.length === 0) {
      filtered = beforeParentFilter;
    }
  }

  filtered = applyProvincePreference(filtered, recentProvinceCodes);
  filtered = applyProvinceHint(filtered, provinceHint);
  filtered = narrowCandidatesByContext(filtered, contextRecords, provinceHint);
  filtered = narrowCandidatesByContext(filtered, globalRecords, provinceHint);

  return filtered;
}

function narrowCandidatesByContext(
  candidates: WardRecord[],
  contextRecords: WardRecord[],
  provinceHint?: ProvinceHint,
): WardRecord[] {
  if (candidates.length <= 1 || contextRecords.length === 0) {
    return candidates;
  }

  let filtered = candidates;
  const provinceCodes = new Set(contextRecords.map((record) => record.provinceCode));
  const provinceNames = new Set(contextRecords.map((record) => record.normalizedProvinceName));

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

  if (filtered.length <= 1) {
    return filtered;
  }

  const districtCodes = new Set(contextRecords.map((record) => record.districtCode).filter(Boolean));
  const districtNames = new Set(contextRecords.map((record) => record.normalizedDistrictName).filter(Boolean));

  if (districtCodes.size === 0 && districtNames.size === 0) {
    return filtered;
  }

  const narrowedByDistrict = filtered.filter((candidate) => {
    const candidateHasDistrict = Boolean(candidate.districtCode || candidate.normalizedDistrictName);
    if (!candidateHasDistrict) {
      return true;
    }
    return districtCodes.has(candidate.districtCode) || districtNames.has(candidate.normalizedDistrictName);
  });

  return narrowedByDistrict.length > 0 ? narrowedByDistrict : filtered;
}

function findReformTarget(
  target: ResolutionClause['to'],
  lookup: ReformLookup,
  sources?: WardRecord[],
  provinceHint?: ProvinceHint,
): WardRecord {
  const normalizedFullName = target.type ? normalizeName(`${renderTypeAlias(target.type)} ${target.name}`) : undefined;
  const exactKey = normalizeWhitespace(target.name).toLowerCase();
  const byExact = lookup.byExactName.get(exactKey);
  const candidates = new Map<string, WardRecord>();
  collectCandidates(byExact, candidates, provinceHint);

  let usedFallback = false;

  while (true) {
    let resolved = Array.from(candidates.values());

    if (target.parentType && target.normalizedParentName) {
      resolved = resolved.filter((candidate) => parentMatches(candidate, target));
    }

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

    if (resolved.length === 1) {
      return resolved[0];
    }

    if (usedFallback) {
      if (resolved.length === 0) {
        throw new Error(`Reform unit not found for "${target.raw}".`);
      }
      const detail = resolved.map((candidate) => `${candidate.fullName} (${candidate.provinceName})`).join('; ');
      throw new Error(`Ambiguous reform unit for "${target.raw}": ${detail}`);
    }

    usedFallback = true;
    const byFull = normalizedFullName ? lookup.byFullName.get(normalizedFullName) : undefined;
    const byName = lookup.byName.get(target.normalizedName);
    collectCandidates(byFull, candidates, provinceHint);
    collectCandidates(byName, candidates, provinceHint);
  }
}

function collectCandidates(
  records: WardRecord[] | undefined,
  accumulator: Map<string, WardRecord>,
  provinceHint?: ProvinceHint,
): void {
  if (!records) {
    return;
  }
  if (!provinceHint) {
    records.forEach((record) => accumulator.set(record.code, record));
    return;
  }

  const preferred: WardRecord[] = [];
  const fallback: WardRecord[] = [];

  records.forEach((record) => {
    const matchesCode = provinceHint.code ? record.provinceCode === provinceHint.code : false;
    const matchesName = provinceHint.normalizedName
      ? record.normalizedProvinceName === provinceHint.normalizedName
      : false;
    if (matchesCode || matchesName) {
      preferred.push(record);
    } else {
      fallback.push(record);
    }
  });

  const chosen = preferred.length > 0 ? preferred : fallback;
  chosen.forEach((record) => accumulator.set(record.code, record));
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

interface AmbiguousResolutionContext {
  lookup: LegacyLookup;
  existingRecords: WardRecord[];
  globalRecords: WardRecord[];
  provinceHint?: ProvinceHint;
  recentProvinceCodes?: Set<string>;
}

function resolveAmbiguousSources(
  sources: ResolutionSource[],
  lookup: LegacyLookup,
  existingRecords: WardRecord[],
  globalRecords: WardRecord[],
  provinceHint?: ProvinceHint,
  recentProvinceCodes?: Set<string>,
): WardRecord[] | undefined {
  if (sources.length === 0) {
    return undefined;
  }

  const context: AmbiguousResolutionContext = {
    lookup,
    existingRecords,
    globalRecords,
    provinceHint,
    recentProvinceCodes,
  };

  const candidateSets = sources
    .map((source) => ({
      source,
      candidates: collectCandidateRecordsForSource(source, context, true),
    }))
    .map((entry) =>
      entry.candidates.length > 0
        ? entry
        : {
            source: entry.source,
            candidates: collectCandidateRecordsForSource(entry.source, context, false),
          },
    )
    .map((entry) => ({
      source: entry.source,
      candidates: dedupeRecords(entry.candidates),
    }))
    .filter((entry) => entry.candidates.length > 0);

  if (candidateSets.length !== sources.length) {
    return undefined;
  }

  candidateSets.sort((a, b) => a.candidates.length - b.candidates.length);

  const usedCodes = new Set<string>([...existingRecords, ...globalRecords].map((record) => record.code));
  const provisionalSelection = new Map<ResolutionSource, WardRecord>();
  let bestSelection: Map<ResolutionSource, WardRecord> | undefined;
  let bestScore: AmbiguousSelectionScore | undefined;

  const targetProvinceHint = provinceHint;

  const baseRecords = [...existingRecords];

  function dfs(index: number, workingRecords: WardRecord[]): void {
    if (index >= candidateSets.length) {
      const selection = new Map(provisionalSelection);
      const score = evaluateSelection([...baseRecords, ...workingRecords], targetProvinceHint);
      if (!bestSelection || compareSelectionScores(score, bestScore!) < 0) {
        bestSelection = selection;
        bestScore = score;
      }
      return;
    }

    const { source, candidates } = candidateSets[index];

    for (const candidate of candidates) {
      if (usedCodes.has(candidate.code)) {
        continue;
      }

      provisionalSelection.set(source, candidate);
      usedCodes.add(candidate.code);
      workingRecords.push(candidate);

      dfs(index + 1, workingRecords);

      workingRecords.pop();
      usedCodes.delete(candidate.code);
      provisionalSelection.delete(source);
    }
  }

  dfs(0, []);

  if (!bestSelection) {
    return undefined;
  }

  return sources.map((source) => bestSelection!.get(source)!).filter(Boolean);
}

interface AmbiguousSelectionScore {
  provinceCount: number;
  districtCount: number;
  hintMatches: number;
}

function evaluateSelection(records: WardRecord[], provinceHint?: ProvinceHint): AmbiguousSelectionScore {
  const provinceCodes = new Set(records.map((record) => record.provinceCode));
  const districtCodes = new Set(records.map((record) => record.districtCode).filter(Boolean));
  let hintMatches = 0;
  if (provinceHint) {
    records.forEach((record) => {
      const matchesCode = provinceHint.code ? record.provinceCode === provinceHint.code : false;
      const matchesName = provinceHint.normalizedName
        ? record.normalizedProvinceName === provinceHint.normalizedName
        : false;
      if (matchesCode || matchesName) {
        hintMatches += 1;
      }
    });
  }

  return {
    provinceCount: provinceCodes.size,
    districtCount: districtCodes.size,
    hintMatches,
  };
}

function compareSelectionScores(a: AmbiguousSelectionScore, b: AmbiguousSelectionScore): number {
  if (a.provinceCount !== b.provinceCount) {
    return a.provinceCount - b.provinceCount;
  }
  if (a.hintMatches !== b.hintMatches) {
    return b.hintMatches - a.hintMatches;
  }
  if (a.districtCount !== b.districtCount) {
    return a.districtCount - b.districtCount;
  }
  return 0;
}

function collectCandidateRecordsForSource(
  source: ResolutionSource,
  context: AmbiguousResolutionContext,
  honorHints: boolean,
): WardRecord[] {
  const { lookup, existingRecords, globalRecords, provinceHint, recentProvinceCodes } = context;
  const effectiveProvinceHint = honorHints ? provinceHint : undefined;
  const effectiveRecentProvinces = honorHints ? recentProvinceCodes : undefined;

  const candidates = new Map<string, WardRecord>();
  const exactKey = normalizeWhitespace(source.name).toLowerCase();
  collectCandidates(lookup.byExactName.get(exactKey), candidates, effectiveProvinceHint);

  if (source.normalizedParentName) {
    const districtKey = makeDistrictKey(source.normalizedParentName, source.normalizedName);
    collectCandidates(lookup.byDistrictName.get(districtKey), candidates, effectiveProvinceHint);
  }

  const normalizedFullName = source.type ? normalizeName(`${renderTypeAlias(source.type)} ${source.name}`) : undefined;
  if (normalizedFullName) {
    collectCandidates(lookup.byFullName.get(normalizedFullName), candidates, effectiveProvinceHint);
  }

  collectCandidates(lookup.byName.get(source.normalizedName), candidates, effectiveProvinceHint);

  const allCandidates = Array.from(candidates.values());
  if (allCandidates.length === 0) {
    return allCandidates;
  }

  const filtered = honorHints
    ? filterCandidates(
        allCandidates,
        source,
        existingRecords,
        globalRecords,
        effectiveProvinceHint,
        effectiveRecentProvinces,
      )
    : applyTypeConstraint(allCandidates, source);

  if (filtered.length > 0) {
    return filtered;
  }

  return honorHints ? collectCandidateRecordsForSource(source, context, false) : applyTypeConstraint(allCandidates, source);
}

function applyTypeConstraint(records: WardRecord[], source: ResolutionSource): WardRecord[] {
  if (!source.type) {
    return records;
  }
  const constrained = records.filter((record) => record.administrativeKind === source.type);
  return constrained.length > 0 ? constrained : records;
}

function dedupeRecords(records: WardRecord[]): WardRecord[] {
  const map = new Map<string, WardRecord>();
  records.forEach((record) => {
    if (!map.has(record.code)) {
      map.set(record.code, record);
    }
  });
  return Array.from(map.values());
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
