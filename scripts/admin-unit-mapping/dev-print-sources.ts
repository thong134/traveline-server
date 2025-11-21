import { promises as fs } from 'fs';
import { parseResolutionText } from './resolution-parser';

async function main() {
  const text = await fs.readFile('scripts/resolutions/Cần_Thơ.txt', 'utf8');
  const clauses = parseResolutionText(text, 'debug');
  clauses.forEach((clause, clauseIndex) => {
    console.log(`${clauseIndex + 1}. ${clause.from.map((source) => {
      const parent = source.parentName ? ` [parent=${source.parentType ?? 'n/a'}:${source.parentName}]` : '';
      return `${source.raw}${parent}`;
    }).join(' + ')} -> ${clause.to.raw}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
