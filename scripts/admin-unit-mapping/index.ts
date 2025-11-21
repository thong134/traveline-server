import { promises as fs } from 'fs';
import * as path from 'path';
import { loadLegacyDataset, loadReformDataset, buildLegacyLookup, buildReformLookup } from './data-loaders';
import { parseResolutionText } from './resolution-parser';
import { resolveClausesToMappings, ProvinceHints } from './mapping-resolver';
import { buildInsertStatement } from './sql-writer';
import { normalizeName } from './normalize';
import { ProvinceRecord } from './types';

interface CliOptions {
  legacyPath: string;
  reformPath: string;
  resolutionPath: string;
  resolutionRef: string;
  outputPath: string;
}

interface ParsedArgs {
  help: boolean;
  options?: CliOptions;
  errors: string[];
}

async function run(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    printUsage();
    return;
  }
  if (parsed.errors.length > 0 || !parsed.options) {
    parsed.errors.forEach((error) => console.error(`Error: ${error}`));
    printUsage();
    process.exitCode = 1;
    return;
  }

  const { legacyPath, reformPath, resolutionPath, resolutionRef, outputPath } = parsed.options;

  const [legacySql, reformSql, resolutionText] = await Promise.all([
    fs.readFile(legacyPath, 'utf8'),
    fs.readFile(reformPath, 'utf8'),
    fs.readFile(resolutionPath, 'utf8'),
  ]);

  const legacyDataset = loadLegacyDataset(legacySql);
  const reformDataset = loadReformDataset(reformSql);
  const legacyLookup = buildLegacyLookup(legacyDataset);
  const reformLookup = buildReformLookup(reformDataset);

  const clauses = parseResolutionText(resolutionText, resolutionRef);
  const provinceHints = deriveProvinceHints(resolutionPath, legacyDataset.provinces, reformDataset.provinces);
  const mappingRows = resolveClausesToMappings(clauses, { legacyLookup, reformLookup, provinceHints });
  const sql = buildInsertStatement(mappingRows);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${sql}\n`, 'utf8');

  console.log(`Generated ${mappingRows.length} mapping rows -> ${outputPath}`);
}

function parseArgs(args: string[]): ParsedArgs {
  const options: Partial<CliOptions> = {};
  const errors: string[] = [];
  let help = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      help = true;
      break;
    }

    if (!arg.startsWith('--')) {
      errors.push(`Unexpected argument "${arg}".`);
      continue;
    }

    const key = arg.replace(/^--/, '');
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      errors.push(`Missing value for --${key}.`);
      continue;
    }
    index += 1;

    switch (key) {
      case 'legacy':
        options.legacyPath = value;
        break;
      case 'reform':
        options.reformPath = value;
        break;
      case 'resolution':
        options.resolutionPath = value;
        break;
      case 'resolutionRef':
        options.resolutionRef = value;
        break;
      case 'output':
        options.outputPath = value;
        break;
      default:
        errors.push(`Unknown option --${key}.`);
    }
  }

  if (!help) {
    const required: Array<keyof CliOptions> = [
      'legacyPath',
      'reformPath',
      'resolutionPath',
      'resolutionRef',
      'outputPath',
    ];
    required.forEach((field) => {
      if (!options[field]) {
        errors.push(`Option --${field.replace(/Path$/, '')} is required.`);
      }
    });
  }

  return {
    help,
    options: help ? undefined : (options as CliOptions),
    errors,
  };
}

function printUsage(): void {
  console.log(`Usage: ts-node scripts/admin-unit-mapping/index.ts \
  --legacy <legacy-sql> \
  --reform <reform-sql> \
  --resolution <resolution-text> \
  --resolutionRef <reference> \
  --output <output-sql>`);
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

function deriveProvinceHints(
  resolutionPath: string,
  legacyProvinces: ProvinceRecord[],
  reformProvinces: ProvinceRecord[],
): ProvinceHints | undefined {
  const basename = path.basename(resolutionPath, path.extname(resolutionPath));
  const candidateName = normalizeName(basename.replace(/[_-]+/g, ' '));
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
