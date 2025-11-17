export interface AdminMappingSeedLegacyUnit {
  province: string;
  district?: string | null;
  ward?: string | null;
}

export interface AdminMappingSeedItem {
  newProvinceCode: string;
  newCommuneCode?: string | null;
  old: AdminMappingSeedLegacyUnit[];
  note?: string | null;
  resolutionRef?: string | null;
}

export type AdminMappingSeedPayload = AdminMappingSeedItem[];
