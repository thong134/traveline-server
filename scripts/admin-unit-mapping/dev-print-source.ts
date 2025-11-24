import { promises as fs } from 'fs';
import { parseResolutionText } from './resolution-parser';

async function main() {
  const resolutionPath = process.argv[2] ?? 'scripts/resolutions/Đồng_Tháp.txt';
  const resolutionRef = process.argv[3] ?? 'inspect';
  const clauseIndex = process.argv[4] ? Number(process.argv[4]) : 0;

  const text = await fs.readFile(resolutionPath, 'utf8');
  const clauses = parseResolutionText(text, resolutionRef);
  const clause = clauses[clauseIndex];

  if (!clause) {
    console.error(`Clause ${clauseIndex} not found.`);
    process.exit(1);
  }

  console.log(`Clause ${clauseIndex + 1}: ${clause.note}`);
  console.log(`Target: ${JSON.stringify(clause.to, null, 2)}`);
  clause.from.forEach((source, idx) => {
    console.log(`Source[${idx}]: ${JSON.stringify(source, null, 2)}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
