import { promises as fs } from 'fs';
import { parseResolutionText } from './resolution-parser';

async function main() {
  const resolutionPath = process.argv[2] ?? 'scripts/resolutions/An_Giang.txt';
  const resolutionRef = process.argv[3] ?? 'QA/2023';
  const resolutionText = await fs.readFile(resolutionPath, 'utf8');
  const clauses = parseResolutionText(resolutionText, resolutionRef);

  clauses.forEach((clause, index) => {
    console.log(`${index + 1}. from=${clause.from.map((source) => source.raw).join(' + ')} -> ${clause.to.raw}`);
    console.log(`   target name="${clause.to.name}"`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
