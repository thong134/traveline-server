import { promises as fs } from 'fs';
import { loadLegacyDataset, buildLegacyLookup } from './data-loaders';
import { normalizeName } from './normalize';

async function main() {
  const [, , rawName] = process.argv;
  if (!rawName) {
    console.error('Usage: ts-node scripts/admin-unit-mapping/dev-find.ts <name>');
    process.exit(1);
  }
  const sql = await fs.readFile('scripts/migrations/ImportData_vn_units_old.sql', 'utf8');
  const dataset = loadLegacyDataset(sql);
  const lookup = buildLegacyLookup(dataset);
  const key = normalizeName(rawName);
  const candidates = lookup.byName.get(key) ?? [];
  console.log(`Found ${candidates.length} entries for "${rawName}" (normalized: ${key})`);
  candidates.forEach((candidate) => {
    console.log(
      `- ${candidate.fullName} | district=${candidate.districtName} (${candidate.districtCode}) | province=${candidate.provinceName} (${candidate.provinceCode}) | kind=${candidate.administrativeKind}`,
    );
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
