import { normalizeWhitespace } from './normalize';

interface RowObject {
  [column: string]: string | null;
}

export class SqlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SqlParseError';
  }
}

export function parseInsertRows(sql: string, tableName: string): RowObject[] {
  const results: RowObject[] = [];
  const insertRegex = new RegExp(
    `INSERT\\s+INTO\\s+${escapeRegExp(tableName)}\\s*\\(([^)]+)\\)\\s*VALUES\\s*([^;]+);`,
    'gi',
  );

  let match: RegExpExecArray | null;
  while ((match = insertRegex.exec(sql)) !== null) {
    const columnList = match[1];
    const rawValuesBlock = match[2];
    const columns = splitColumns(columnList);
    const tupleStrings = splitTuples(rawValuesBlock);

    tupleStrings.forEach((tuple) => {
      const values = splitValues(tuple);
      if (values.length !== columns.length) {
        throw new SqlParseError(
          `Tuple column mismatch for table ${tableName}: expected ${columns.length}, received ${values.length}.`,
        );
      }

      const row: RowObject = {};
      columns.forEach((column, index) => {
        row[column] = sanitizeValue(values[index]);
      });
      results.push(row);
    });
  }

  return results;
}

function splitColumns(columnList: string): string[] {
  return columnList
    .split(',')
    .map((value) => normalizeWhitespace(value).replace(/[`"\[\]]/g, ''));
}

function splitTuples(valuesBlock: string): string[] {
  const tuples: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < valuesBlock.length; i += 1) {
    const char = valuesBlock[i];

    if (char === '(') {
      if (depth === 0) {
        current = '';
      }
      depth += 1;
    }

    if (depth > 0) {
      current += char;
    }

    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        tuples.push(current.trim());
        current = '';
      }
    }
  }

  return tuples;
}

function splitValues(tuple: string): string[] {
  const inner = tuple.trim().replace(/^\(/, '').replace(/\)$/, '');
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];

    if (char === "'") {
      if (inQuotes && inner[i + 1] === "'") {
        current += "'";
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || inner.endsWith(',')) {
    values.push(current.trim());
  }

  return values;
}

function sanitizeValue(value: string): string | null {
  if (!value.length) {
    return '';
  }
  if (/^NULL$/i.test(value)) {
    return null;
  }
  return value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
