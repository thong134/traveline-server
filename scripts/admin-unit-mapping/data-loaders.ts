import { parseInsertRows } from './sql-parser';
import { normalizeName, normalizeWhitespace } from './normalize';
import {
  AdministrativeUnitDefinition,
  AdministrativeUnitKind,
  LegacyDataset,
  ReformDataset,
  LegacyLookup,
  ReformLookup,
  ProvinceRecord,
  DistrictRecord,
  WardRecord,
} from './types';

const KIND_MAP: Record<string, AdministrativeUnitKind> = {
  'thi tran': 'thi_tran',
  'xa': 'xa',
  'phuong': 'phuong',
  'quan': 'quan',
  'huyen': 'huyen',
  'thi xa': 'thi_xa',
  'thi xa bien gioi': 'thi_xa',
  'thi xa lao cai': 'thi_xa',
  'thi xa ban phu': 'thi_xa',
  'thi xa bac ninh': 'thi_xa',
  'thanh pho': 'thanh_pho',
  'thanh pho thuoc tinh': 'thanh_pho',
  'thanh pho truc thuoc trung uong': 'thanh_pho',
};

export function loadLegacyDataset(sql: string): LegacyDataset {
  const unitTypes = buildUnitTypeMap(sql, 'administrative_units_old');
  const provinces = buildProvinceRecords(sql, 'provinces');
  const provinceIndex = indexByCode(provinces);

  const districtRows = parseInsertRows(sql, 'districts');
  const districts: DistrictRecord[] = districtRows.map((row) => {
    const code = ensure(row.code, 'district.code');
    const provinceCode = ensure(row.province_code, 'district.province_code');
    const province = provinceIndex.get(provinceCode);
    if (!province) {
      throw new Error(`Unknown province ${provinceCode} referenced by district ${code}`);
    }

    const name = ensure(row.name, 'district.name');
    const fullName = row.full_name ?? name;

    return {
      code,
      provinceCode,
      provinceName: province.name,
      normalizedProvinceName: province.normalizedName,
      name,
      normalizedName: normalizeName(name),
      fullName,
      administrativeUnitId: ensure(row.administrative_unit_id, 'district.administrative_unit_id'),
    };
  });
  const districtIndex = indexByCode(districts);

  const wardRows = parseInsertRows(sql, 'wards');
  const wards: WardRecord[] = wardRows.map((row) => {
    const code = ensure(row.code, 'ward.code');
    const districtCode = ensure(row.district_code, 'ward.district_code');
    const district = districtIndex.get(districtCode);
    if (!district) {
      throw new Error(`Unknown district ${districtCode} referenced by ward ${code}`);
    }
    const province = provinceIndex.get(district.provinceCode);
    if (!province) {
      throw new Error(`Unknown province ${district.provinceCode} referenced by ward ${code}`);
    }

    const name = ensure(row.name, 'ward.name');
    const fullName = row.full_name ?? name;
    const administrativeUnitId = ensure(row.administrative_unit_id, 'ward.administrative_unit_id');
    const administrativeKind = resolveKind(unitTypes.get(administrativeUnitId));

    return {
      code,
      districtCode,
      districtName: district.name,
      normalizedDistrictName: district.normalizedName,
      provinceCode: district.provinceCode,
      provinceName: province.name,
      normalizedProvinceName: province.normalizedName,
      name,
      normalizedName: normalizeName(name),
      fullName,
      normalizedFullName: normalizeName(fullName),
      administrativeUnitId,
      administrativeKind,
    };
  });

  return {
    unitTypes,
    provinces,
    districts,
    wards,
  };
}

export function loadReformDataset(sql: string): ReformDataset {
  const unitTypes = buildUnitTypeMap(sql, 'administrative_units');
  const provinces = buildProvinceRecords(sql, 'province_after_communes', 'provinces');
  const provinceIndex = indexByCode(provinces);

  const wardRows = retrieveWardRows(sql);
  const wards: WardRecord[] = wardRows.map((row) => {
    const code = ensure(row.code, 'ward_after.code');
    const name = ensure(row.name, 'ward_after.name');
    const fullName = row.full_name ?? name;
    const provinceCode = ensure(row.province_code, 'ward_after.province_code');
    const province = provinceIndex.get(provinceCode);
    if (!province) {
      throw new Error(`Unknown province ${provinceCode} referenced by ward ${code}`);
    }

    const administrativeUnitId = ensure(row.administrative_unit_id, 'ward_after.administrative_unit_id');
    const administrativeKind = resolveKind(unitTypes.get(administrativeUnitId));

    const districtCode = row.district_code ?? '';
    const districtName = row.district_name ?? '';

    return {
      code,
      districtCode,
      districtName,
      normalizedDistrictName: districtName ? normalizeName(districtName) : '',
      provinceCode,
      provinceName: province.name,
      normalizedProvinceName: province.normalizedName,
      name,
      normalizedName: normalizeName(name),
      fullName,
      normalizedFullName: normalizeName(fullName),
      administrativeUnitId,
      administrativeKind,
    };
  });

  return {
    unitTypes,
    provinces,
    wards,
  };
}

export function buildLegacyLookup(dataset: LegacyDataset): LegacyLookup {
  const byExactName = new Map<string, WardRecord[]>();
  const byName = new Map<string, WardRecord[]>();
  const byFullName = new Map<string, WardRecord[]>();
  const byDistrictName = new Map<string, WardRecord[]>();

  dataset.wards.forEach((ward) => {
    addToIndex(byExactName, normalizeWhitespace(ward.name).toLowerCase(), ward);
    addToIndex(byName, ward.normalizedName, ward);
    addToIndex(byFullName, ward.normalizedFullName, ward);
    const districtKey = makeDistrictKey(ward.normalizedDistrictName, ward.normalizedName);
    addToIndex(byDistrictName, districtKey, ward);
  });

  return { byExactName, byName, byFullName, byDistrictName };
}

export function buildReformLookup(dataset: ReformDataset): ReformLookup {
  const byExactName = new Map<string, WardRecord[]>();
  const byName = new Map<string, WardRecord[]>();
  const byFullName = new Map<string, WardRecord[]>();

  dataset.wards.forEach((ward) => {
    addToIndex(byExactName, normalizeWhitespace(ward.name).toLowerCase(), ward);
    addToIndex(byName, ward.normalizedName, ward);
    addToIndex(byFullName, ward.normalizedFullName, ward);
  });

  return { byExactName, byName, byFullName };
}

function buildUnitTypeMap(sql: string, primaryTable: string, fallbackTable?: string): Map<string, AdministrativeUnitDefinition> {
  const rows = parseInsertRows(sql, primaryTable);
  const resolvedRows = rows.length === 0 && fallbackTable ? parseInsertRows(sql, fallbackTable) : rows;
  const map = new Map<string, AdministrativeUnitDefinition>();

  resolvedRows.forEach((row) => {
    const id = ensure(row.id, `${primaryTable}.id`);
    const shortName = ensure(row.short_name ?? row.short_name_en ?? row.full_name, `${primaryTable}.short_name`);
    const fullName = row.full_name ?? shortName;
    const normalizedShortName = normalizeName(shortName);
    map.set(id, {
      id,
      shortName,
      fullName,
      normalizedShortName,
      kind: resolveKindFromShortName(normalizedShortName),
    });
  });

  return map;
}

function buildProvinceRecords(sql: string, primaryTable: string, fallbackTable?: string): ProvinceRecord[] {
  const rows = parseInsertRows(sql, primaryTable);
  const resolvedRows = rows.length === 0 && fallbackTable ? parseInsertRows(sql, fallbackTable) : rows;
  return resolvedRows.map((row) => {
    const code = ensure(row.code, `${primaryTable}.code`);
    const name = ensure(row.name, `${primaryTable}.name`);
    const fullName = row.full_name ?? name;

    return {
      code,
      name,
      normalizedName: normalizeName(name),
      fullName,
    };
  });
}

function retrieveWardRows(sql: string) {
  const primary = parseInsertRows(sql, 'wards_after_communes');
  if (primary.length > 0) {
    return primary;
  }
  const fallback = parseInsertRows(sql, 'wards');
  if (fallback.length === 0) {
    throw new Error('No ward data found in reform dataset.');
  }
  return fallback;
}

function resolveKind(definition?: AdministrativeUnitDefinition): AdministrativeUnitKind {
  if (!definition) {
    return 'khac';
  }
  return definition.kind;
}

function resolveKindFromShortName(normalizedShortName: string): AdministrativeUnitKind {
  if (KIND_MAP[normalizedShortName]) {
    return KIND_MAP[normalizedShortName];
  }
  if (normalizedShortName.includes('thanh pho')) {
    return 'thanh_pho';
  }
  if (normalizedShortName.includes('tinh')) {
    return 'khac';
  }
  return 'khac';
}

function ensure<T>(value: T | undefined | null, field: string): T {
  if (value === undefined || value === null) {
    throw new Error(`Missing value for ${field}`);
  }
  return value;
}

function indexByCode<T extends { code: string }>(records: T[]): Map<string, T> {
  const map = new Map<string, T>();
  records.forEach((record) => map.set(record.code, record));
  return map;
}

function addToIndex(map: Map<string, WardRecord[]>, key: string, ward: WardRecord): void {
  if (!key) {
    return;
  }
  const existing = map.get(key);
  if (existing) {
    existing.push(ward);
  } else {
    map.set(key, [ward]);
  }
}

function makeDistrictKey(district: string, name: string): string {
  return `${district}::${name}`;
}
