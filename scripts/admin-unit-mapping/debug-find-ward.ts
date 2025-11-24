import { parseResolutionText } from './resolution-parser';
import { readFileSync } from 'node:fs';

const clauses = parseResolutionText(
  readFileSync('scripts/resolutions/Hồ_Chí_Minh.txt', 'utf8'),
  'debug',
);

clauses.forEach((clause, clauseIndex) => {
  clause.from.forEach((source, sourceIndex) => {
    if (/^phường\s+15$/i.test(source.raw.trim())) {
      console.log({ clauseIndex: clauseIndex + 1, sourceIndex: sourceIndex + 1, source });
    }
  });
});
