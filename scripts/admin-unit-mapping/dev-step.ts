import { promises as fs } from 'fs';
import { loadLegacyDataset, buildLegacyLookup, loadReformDataset, buildReformLookup } from './data-loaders';
import { parseResolutionText } from './resolution-parser';
import { resolveClausesToMappings, ProvinceHints } from './mapping-resolver';
import { normalizeName } from './normalize';
import { ProvinceRecord } from './types';

async function main() {
  const legacySql = await fs.readFile('scripts/migrations/ImportData_vn_units_old.sql', 'utf8');
  const reformSql = await fs.readFile('scripts/migrations/ImportData_vn_units.sql', 'utf8');
  const resolutionText = await fs.readFile('scripts/resolutions/Cần_Thơ.txt', 'utf8');

  const legacyDataset = loadLegacyDataset(legacySql);
  const reformDataset = loadReformDataset(reformSql);
  const legacyLookup = buildLegacyLookup(legacyDataset);
  const reformLookup = buildReformLookup(reformDataset);

  const clauses = parseResolutionText(resolutionText, 'debug');
  const provinceHints = deriveProvinceHints('scripts/resolutions/Cần_Thơ.txt', legacyDataset.provinces, reformDataset.provinces);

  for (let index = 0; index < clauses.length; index += 1) {
    try {
      resolveClausesToMappings(clauses.slice(0, index + 1), { legacyLookup, reformLookup, provinceHints });
    } catch (error) {
      console.error(`Failed at clause ${index + 1}`);
      console.error('Clause note:', clauses[index].note);
      throw error;
    }
  }

  console.log('All clauses resolved successfully.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function deriveProvinceHints(
  resolutionPath: string,
  legacyProvinces: ProvinceRecord[],
  reformProvinces: ProvinceRecord[],
): ProvinceHints | undefined {
  const candidateName = normalizeName(resolutionPath.replace(/^.*[\\/]/, '').replace(/[_-]+/g, ' ').replace(/\.\w+$/, ''));
  if (!candidateName) {
    return undefined;
  }

  const candidateNames = new Set<string>([candidateName]);
  candidateNames.add(`tinh ${candidateName}`);
  candidateNames.add(`thanh pho ${candidateName}`);

  const legacy = findProvinceMatch(legacyProvinces, candidateNames);
  const reform = findProvinceMatch(reformProvinces, candidateNames);

  if (!legacy && !reform) {
    return undefined;
  }

  return {
    legacy: legacy
      ? {
          code: legacy.code,
          normalizedName: legacy.normalizedName,
        }
      : undefined,
    reform: reform
      ? {
          code: reform.code,
          normalizedName: reform.normalizedName,
        }
      : legacy
      ? {
          normalizedName: legacy.normalizedName,
        }
      : undefined,
  };
}

function findProvinceMatch(provinces: ProvinceRecord[], candidateNames: Set<string>): ProvinceRecord | undefined {
  for (const province of provinces) {
    if (candidateNames.has(province.normalizedName)) {
      return province;
    }
  }

  for (const province of provinces) {
    const normalizedFull = normalizeName(province.fullName);
    if (candidateNames.has(normalizedFull)) {
      return province;
    }
  }

  return undefined;
}
