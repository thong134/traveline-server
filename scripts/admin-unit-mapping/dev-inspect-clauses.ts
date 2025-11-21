import { promises as fs } from 'fs';
import { parseResolutionText } from './resolution-parser';

async function main() {
  const resolutionText = await fs.readFile('scripts/resolutions/An_Giang.txt', 'utf8');
  const clauses = parseResolutionText(resolutionText, 'QA/2023');

  clauses.forEach((clause, index) => {
    console.log(`${index + 1}. from=${clause.from.map((source) => source.raw).join(' + ')} -> ${clause.to.raw}`);
    console.log(`   target name="${clause.to.name}"`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
