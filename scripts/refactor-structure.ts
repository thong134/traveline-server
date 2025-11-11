import { promises as fs } from 'fs';
import path from 'path';

type MoveRecord = {
  from: string;
  to: string;
  targetFull: string;
};

type Mapping = Map<string, MoveRecord>;
type ReverseLookup = Map<string, string>;

const SRC_ROOT = path.resolve(__dirname, '..', 'src');
const MODULES_ROOT = path.join(SRC_ROOT, 'modules');
const SEARCH_ROOTS = [
  SRC_ROOT,
  path.resolve(__dirname, '..', 'test'),
  path.resolve(__dirname, '..', 'scripts'),
];
const RESERVED_DIRS = new Set(['modules', 'common', 'core', 'types']);

type ModulePlacement = {
  moduleName: string;
  targetDir: string;
  displayName: string;
};

async function main(): Promise<void> {
  await ensureDir(MODULES_ROOT);

  const entries = await fs.readdir(SRC_ROOT, { withFileTypes: true });
  const mapping: Mapping = new Map();
  const reverseLookup: ReverseLookup = new Map();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (RESERVED_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;

    const sourceDir = path.join(SRC_ROOT, entry.name);
    const placement = computeModulePlacement(entry.name);

    console.log(`Processing module: ${entry.name} -> ${placement.displayName}`);
    await processModuleDirectory(
      sourceDir,
      placement.targetDir,
      placement.moduleName,
      mapping,
      reverseLookup,
    );
  }

  if (mapping.size === 0) {
    console.log('No module directories were moved.');
    return;
  }

  await updateImportSpecifiers(mapping, reverseLookup);

  console.log('Refactor completed.');
}

function computeModulePlacement(entryName: string): ModulePlacement {
  const singularName = toSingular(entryName);
  const billSuffix = '-bill';

  if (singularName.endsWith(billSuffix)) {
    const baseRaw = singularName.slice(0, -billSuffix.length);
    const baseModule = toSingular(baseRaw);
    const moduleName = `${baseModule}${billSuffix}`;
    const targetDir = path.join(MODULES_ROOT, baseModule, 'bill');
    return {
      moduleName,
      targetDir,
      displayName: `${baseModule}/bill`,
    };
  }

  return {
    moduleName: singularName,
    targetDir: path.join(MODULES_ROOT, singularName),
    displayName: singularName,
  };
}

async function processModuleDirectory(
  sourceDir: string,
  targetDir: string,
  moduleName: string,
  mapping: Mapping,
  reverseLookup: ReverseLookup,
): Promise<void> {
  if (!(await pathExists(sourceDir))) {
    console.warn(`  Skipping ${sourceDir} (directory not found).`);
    return;
  }

  await ensureDir(path.join(targetDir, 'dto'));
  await ensureDir(path.join(targetDir, 'entities'));

  const files = await collectFiles(sourceDir);

  for (const filePath of files) {
    const baseName = path.basename(filePath);
    let destination: string;

    if (baseName.endsWith('.entity.ts')) {
      destination = path.join(targetDir, 'entities', baseName);
    } else if (baseName.endsWith('.dto.ts')) {
      destination = path.join(targetDir, 'dto', baseName);
    } else if (baseName.endsWith('.controller.ts')) {
      destination = path.join(targetDir, `${moduleName}.controller.ts`);
    } else if (baseName.endsWith('.service.ts')) {
      destination = path.join(targetDir, `${moduleName}.service.ts`);
    } else if (baseName.endsWith('.module.ts')) {
      destination = path.join(targetDir, `${moduleName}.module.ts`);
    } else {
      const relative = path.relative(sourceDir, filePath);
      destination = path.join(targetDir, relative);
    }

    if (normalizeFullPath(filePath) === normalizeFullPath(destination)) {
      continue;
    }

    if (await pathExists(destination)) {
      console.warn(`    Destination already exists, skipping: ${destination}`);
      continue;
    }

    await ensureDir(path.dirname(destination));
    await fs.rename(filePath, destination);
    recordMove(filePath, destination, mapping, reverseLookup);
  }

  await cleanupEmptyDirectories(sourceDir);
}

async function updateImportSpecifiers(
  mapping: Mapping,
  reverseLookup: ReverseLookup,
): Promise<void> {
  for (const root of SEARCH_ROOTS) {
    if (!(await pathExists(root))) continue;
    const tsFiles = await collectTsFiles(root);
    for (const filePath of tsFiles) {
      const content = await fs.readFile(filePath, 'utf8');
      const updated = rewriteSpecifiers(
        content,
        filePath,
        mapping,
        reverseLookup,
      );
      if (updated !== content) {
        await fs.writeFile(filePath, updated, 'utf8');
      }
    }
  }
}

function rewriteSpecifiers(
  source: string,
  filePath: string,
  mapping: Mapping,
  reverseLookup: ReverseLookup,
): string {
  let result = source;

  const patterns: Array<RegExp> = [
    /(import[\s{}*\w,\r\n]*from\s+)(['"])([^'"]+)(\2)/g,
    /(export[\s{}*\w,\r\n]*from\s+)(['"])([^'"]+)(\2)/g,
  ];

  for (const pattern of patterns) {
    result = result.replace(
      pattern,
      (match, prefix: string, quote: string, spec: string) => {
        const updated = resolveSpecifier(
          spec,
          filePath,
          mapping,
          reverseLookup,
        );
        if (!updated) return match;
        return `${prefix}${quote}${updated}${quote}`;
      },
    );
  }

  const dynamicImport = /(import\()(['"])([^'"]+)(\2)(\))/g;
  result = result.replace(
    dynamicImport,
    (
      match,
      lead: string,
      quote: string,
      spec: string,
      _q: string,
      tail: string,
    ) => {
      const updated = resolveSpecifier(spec, filePath, mapping, reverseLookup);
      if (!updated) return match;
      return `${lead}${quote}${updated}${quote}${tail}`;
    },
  );

  const requirePattern = /(require\()(['"])([^'"]+)(\2)(\))/g;
  result = result.replace(
    requirePattern,
    (
      match,
      lead: string,
      quote: string,
      spec: string,
      _q: string,
      tail: string,
    ) => {
      const updated = resolveSpecifier(spec, filePath, mapping, reverseLookup);
      if (!updated) return match;
      return `${lead}${quote}${updated}${quote}${tail}`;
    },
  );

  return result;
}

function resolveSpecifier(
  spec: string,
  filePath: string,
  mapping: Mapping,
  reverseLookup: ReverseLookup,
): string | null {
  if (!spec.startsWith('.')) return null;

  const fileDir = path.dirname(filePath);
  const originalFile =
    reverseLookup.get(normalizeFullPath(filePath)) ?? filePath;
  const originalDir = path.dirname(originalFile);

  const baseCandidates = [path.resolve(fileDir, spec)];
  if (toPosix(originalDir) !== toPosix(fileDir)) {
    baseCandidates.push(path.resolve(originalDir, spec));
  }

  for (const base of baseCandidates) {
    const candidates = [
      base,
      `${base}.ts`,
      `${base}.js`,
      `${base}.mts`,
      `${base}.cts`,
      path.join(base, 'index.ts'),
      path.join(base, 'index.js'),
    ];

    for (const candidate of candidates) {
      const key = normalizeWithoutExtension(candidate);
      const record = mapping.get(key);
      if (!record) continue;

      let relative = path
        .relative(fileDir, record.targetFull)
        .replace(/\\/g, '/');
      if (!relative.startsWith('.')) {
        relative = `./${relative}`;
      }

      if (!shouldKeepExtension(spec)) {
        relative = relative.replace(/\.ts$/, '');
      }

      return relative;
    }
  }

  return null;
}

function shouldKeepExtension(spec: string): boolean {
  return (
    spec.endsWith('.ts') ||
    spec.endsWith('.js') ||
    spec.endsWith('.mts') ||
    spec.endsWith('.cts')
  );
}

function recordMove(
  from: string,
  to: string,
  mapping: Mapping,
  reverseLookup: ReverseLookup,
): void {
  const absoluteFrom = path.resolve(from);
  const absoluteTo = path.resolve(to);
  const key = normalizeWithoutExtension(absoluteFrom);
  mapping.set(key, {
    from: absoluteFrom,
    to: absoluteTo,
    targetFull: absoluteTo,
  });
  reverseLookup.set(normalizeFullPath(absoluteTo), absoluteFrom);
}

async function collectFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  if (!(await pathExists(dir))) return results;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

async function collectTsFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  if (!(await pathExists(dir))) return results;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectTsFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function cleanupEmptyDirectories(dir: string): Promise<void> {
  if (!(await pathExists(dir))) return;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await cleanupEmptyDirectories(fullPath);
    }
  }
  const remaining = await fs.readdir(dir);
  if (remaining.length === 0) {
    await fs.rmdir(dir).catch(() => undefined);
  }
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function normalizeWithoutExtension(value: string): string {
  const resolved = path.resolve(value);
  const ext = path.extname(resolved);
  const without = ext ? resolved.slice(0, -ext.length) : resolved;
  return toPosix(path.normalize(without));
}

function normalizeFullPath(value: string): string {
  return toPosix(path.resolve(value));
}

function toPosix(value: string): string {
  return value.replace(/[\\]+/g, '/');
}

function toSingular(dirName: string): string {
  const segments = dirName.split('-');
  const lastIndex = segments.length - 1;
  const singularSegments = segments.map((segment, index) =>
    index === lastIndex ? singularizeWord(segment) : segment,
  );
  return singularSegments.join('-');
}

function singularizeWord(word: string): string {
  const lower = word.toLowerCase();

  if (lower.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  }

  if (
    lower.endsWith('ses') ||
    lower.endsWith('xes') ||
    lower.endsWith('zes') ||
    lower.endsWith('ches') ||
    lower.endsWith('shes')
  ) {
    return word.slice(0, -2);
  }

  if (lower.endsWith('ss') || lower.endsWith('us')) {
    return word;
  }

  if (lower.endsWith('s')) {
    return word.slice(0, -1);
  }

  return word;
}

main().catch((error) => {
  console.error('Refactor failed:', error);
  process.exitCode = 1;
});
