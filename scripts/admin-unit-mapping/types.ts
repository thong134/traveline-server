export type AdministrativeUnitKind = 'thi_tran' | 'xa' | 'phuong' | 'quan' | 'huyen' | 'thi_xa' | 'thanh_pho' | 'khac';

export interface AdministrativeUnitDefinition {
  id: string;
  shortName: string;
  fullName: string;
  normalizedShortName: string;
  kind: AdministrativeUnitKind;
}

export interface ProvinceRecord {
  code: string;
  name: string;
  normalizedName: string;
  fullName: string;
}

export interface DistrictRecord {
  code: string;
  provinceCode: string;
  provinceName: string;
  normalizedProvinceName: string;
  name: string;
  normalizedName: string;
  fullName: string;
  administrativeUnitId: string;
}

export interface WardRecord {
  code: string;
  districtCode: string;
  districtName: string;
  normalizedDistrictName: string;
  provinceCode: string;
  provinceName: string;
  normalizedProvinceName: string;
  name: string;
  normalizedName: string;
  fullName: string;
  normalizedFullName: string;
  administrativeUnitId: string;
  administrativeKind: AdministrativeUnitKind;
}

export interface LegacyDataset {
  unitTypes: Map<string, AdministrativeUnitDefinition>;
  provinces: ProvinceRecord[];
  districts: DistrictRecord[];
  wards: WardRecord[];
}

export interface ReformDataset {
  unitTypes: Map<string, AdministrativeUnitDefinition>;
  provinces: ProvinceRecord[];
  wards: WardRecord[];
}

export interface LegacyLookup {
  byExactName: Map<string, WardRecord[]>;
  byName: Map<string, WardRecord[]>;
  byFullName: Map<string, WardRecord[]>;
  byDistrictName: Map<string, WardRecord[]>;
}

export interface ReformLookup {
  byName: Map<string, WardRecord[]>;
  byFullName: Map<string, WardRecord[]>;
}

export interface ResolutionSource {
  raw: string;
  name: string;
  normalizedName: string;
  type?: AdministrativeUnitKind;
  parentName?: string;
  normalizedParentName?: string;
  parentType?: 'huyen' | 'thi_xa' | 'thanh_pho' | 'quan' | 'tinh';
}

export interface ResolutionTarget {
  raw: string;
  name: string;
  normalizedName: string;
  type?: AdministrativeUnitKind;
  parentName?: string;
  normalizedParentName?: string;
  parentType?: 'huyen' | 'thi_xa' | 'thanh_pho' | 'quan' | 'tinh';
}

export interface ResolutionClause {
  from: ResolutionSource[];
  to: ResolutionTarget;
  note: string;
  resolutionRef: string;
}

export interface MappingRow {
  oldProvinceCode: string;
  oldDistrictCode: string;
  oldWardCode: string;
  newProvinceCode: string;
  newCommuneCode: string;
  note: string;
  resolutionRef: string;
}
