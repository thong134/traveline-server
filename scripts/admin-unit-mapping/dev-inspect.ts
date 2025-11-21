import { promises as fs } from 'fs';
import { parseResolutionText } from './resolution-parser';

async function main() {
  const text = await fs.readFile('scripts/resolutions/An_Giang.txt', 'utf8');
  const clauses = parseResolutionText(text, 'debug');
  clauses.forEach((clause, index) => {
    if (index < 15) {
      console.log(`${index + 1}. ${clause.from.map((item) => item.name).join(', ')}`);
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
