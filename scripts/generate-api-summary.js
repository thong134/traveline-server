const fs = require('fs');
const path = require('path');

// Recursively collect TypeScript files under a directory
function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    if (entry.isFile() && entry.name.endsWith('.ts')) return [fullPath];
    return [];
  });
}

function cleanDecoratorArg(raw) {
  if (!raw) return '';
  const trimmed = raw.trim();
  const quoteMatch = trimmed.match(/^["'`](.*)["'`]$/);
  return quoteMatch ? quoteMatch[1] : trimmed;
}

function getModuleName(filePath) {
  const parts = filePath.split(path.sep);
  const modulesIdx = parts.lastIndexOf('modules');
  if (modulesIdx === -1 || modulesIdx + 1 >= parts.length) return 'root';
  return parts[modulesIdx + 1];
}

function parseFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const moduleName = getModuleName(filePath);

  // Controller metadata
  const controllerMatch = text.match(/@Controller\(([^)]*)\)/);
  const controllerPath = controllerMatch ? cleanDecoratorArg(controllerMatch[1]) : null;

  const entries = [];

  let pendingRoute = null;
  let currentEntry = null;

  const methodDecoratorRegex = /@(Get|Post|Put|Patch|Delete|All|Head|Options)\(([^)]*)\)/;
  const methodSignatureRegex = /^(?:\s*public\s+)?(?:\s*async\s+)?(\w+)\s*\(/;
  const throwRegex = /throw new (\w+Exception)\(([^)]*)\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const decoratorMatch = line.match(methodDecoratorRegex);
    if (decoratorMatch) {
      pendingRoute = {
        httpMethod: decoratorMatch[1].toUpperCase(),
        subPath: cleanDecoratorArg(decoratorMatch[2]),
      };
      continue;
    }

    const sigMatch = line.match(methodSignatureRegex);
    if (sigMatch) {
      const methodName = sigMatch[1];
      const entry = {
        module: moduleName,
        file: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
        httpMethod: pendingRoute ? pendingRoute.httpMethod : null,
        apiPath: pendingRoute && controllerPath !== null
          ? `/${controllerPath}${pendingRoute.subPath ? `/${pendingRoute.subPath}` : ''}`.replace(/\/+/g, '/').replace(/\/+$/, '').replace(/^$/, '/')
          : null,
        functionName: methodName,
        conditions: [],
      };
      entries.push(entry);
      currentEntry = entry;
      pendingRoute = null;
      continue;
    }

    const throwMatch = line.match(throwRegex);
    if (throwMatch && currentEntry) {
      const conditionLine = line.trim() || (lines[i - 1] ? lines[i - 1].trim() : '');
      const rawArg = throwMatch[2];
      const msgMatch = rawArg.match(/["'`](.*?)["'`]/);
      const message = msgMatch ? msgMatch[1] : rawArg.trim();
      currentEntry.conditions.push({
        condition: conditionLine,
        message,
        exception: throwMatch[1],
        line: i + 1,
      });
    }
  }

  return { entries, controllerPath };
}

function buildMarkdown(entries) {
  const grouped = entries.reduce((acc, entry) => {
    const key = entry.module;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  let md = '# API Messages Summary\n\n';
  md += 'Generated automatically by scripts/generate-api-summary.js.\n\n';

  for (const moduleName of Object.keys(grouped).sort()) {
    md += `## Module: ${moduleName}\n\n`;
    const moduleEntries = grouped[moduleName];
    for (const entry of moduleEntries) {
      const apiLabel = entry.httpMethod && entry.apiPath
        ? `${entry.httpMethod} ${entry.apiPath}`
        : 'Service / no explicit route';
      md += `- API: ${apiLabel}\n`;
      md += `  - Function: ${entry.functionName}\n`;
      if (entry.conditions.length === 0) {
        md += '  - Conditions and Messages:\n    - None found (No explicit message)\n';
      } else {
        md += '  - Conditions and Messages:\n';
        for (const cond of entry.conditions) {
          md += `    - Condition: ${cond.condition}\n      Message: ${cond.message}\n`;
        }
      }
      md += '\n';
    }
  }
  return md;
}

function main() {
  const modulesDir = path.join(process.cwd(), 'src', 'modules');
  const files = collectFiles(modulesDir).filter((file) => file.endsWith('.controller.ts') || file.endsWith('.service.ts'));
  const allEntries = [];

  for (const file of files) {
    const result = parseFile(file);
    allEntries.push(...result.entries);
  }

  const markdown = buildMarkdown(allEntries);
  const outPath = path.join(process.cwd(), 'api_messages_summary.md');
  fs.writeFileSync(outPath, markdown, 'utf8');
  console.log(`Wrote ${outPath} with ${allEntries.length} entries.`);
}

main();