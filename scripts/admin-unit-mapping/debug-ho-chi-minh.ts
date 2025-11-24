import { parseResolutionText } from './resolution-parser';
import { readFileSync } from 'node:fs';

const resolution = readFileSync('scripts/resolutions/Hồ_Chí_Minh.txt', 'utf8');
const clauses = parseResolutionText(resolution, 'debug');

clauses.forEach((clause, clauseIndex) => {
  clause.from.forEach((source, sourceIndex) => {
    if (source.name.toLowerCase().includes('diện') || source.raw.toLowerCase().includes('diện')) {
      console.log({ clauseIndex: clauseIndex + 1, sourceIndex: sourceIndex + 1, source });
    }
  });
});
