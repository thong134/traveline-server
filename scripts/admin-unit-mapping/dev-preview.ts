import { promises as fs } from 'fs';
import { parseResolutionText } from './resolution-parser';

async function main() {
  const text = await fs.readFile('scripts/resolutions/An_Giang.txt', 'utf8');
  const clauses = parseResolutionText(text, 'debug');
  clauses.forEach((clause, index) => {
    const formatted = clause.from.map((item) => `${item.raw} -> ${item.name}`).join(' | ');
    console.log(`${index + 1}: ${formatted}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
