import { MappingRow } from './types';

export function buildInsertStatement(rows: MappingRow[]): string {
  if (rows.length === 0) {
    return '';
  }

  const valueLines = rows
    .map((row) =>
      [
        row.oldProvinceCode,
        row.oldDistrictCode,
        row.oldWardCode,
        row.newProvinceCode,
        row.newCommuneCode,
        row.note,
        row.resolutionRef,
      ]
        .map((value) => quote(value))
        .join(', '),
    )
    .map((line) => `  (${line})`)
    .join(',\n');

  return [
    'INSERT INTO vn_admin_unit_mappings (',
    '  old_province_code,',
    '  old_district_code,',
    '  old_ward_code,',
    '  new_province_code,',
    '  new_commune_code,',
    '  note,',
    '  resolution_ref',
    ')',
    'VALUES',
    `${valueLines};`,
  ].join('\n');
}

function quote(value: string): string {
  const safe = value.replace(/'/g, "''");
  return `'${safe}'`;
}
