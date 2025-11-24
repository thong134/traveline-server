import { normalizeName, normalizeWhitespace, stripAccents } from './normalize';
import { AdministrativeUnitKind, ResolutionClause, ResolutionSource, ResolutionTarget } from './types';

const CLAUSE_SPLIT_REGEX = /(?<=[.;])\s+|\n+/;
const UNIT_PATTERN = /(thị trấn|thị xã|xã|phường|thành phố|quận|huyện)/i;
const BASIC_UNIT_TOKENS = /(thị\s*trấn|thị\s*xã|xã|phường|thành\s*phố|quận|huyện)/giu;

export function parseResolutionText(rawText: string, resolutionRef: string): ResolutionClause[] {
  const normalized = rawText.normalize('NFC').replace(/\r\n?/g, '\n');
  const fragments = normalized
    .split(CLAUSE_SPLIT_REGEX)
    .map((fragment) => normalizeWhitespace(fragment))
    .filter((fragment) => fragment.length > 0 && /thành/i.test(fragment));

  const clauses: ResolutionClause[] = [];

  fragments.forEach((fragment) => {
    const clause = parseClause(fragment, resolutionRef);
    if (clause) {
      clauses.push(clause);
    }
  });

  return clauses;
}

function parseClause(fragment: string, resolutionRef: string): ResolutionClause | null {
  const transitionMatch = fragment.match(/\bthành\s+(thị\s+trấn|thị\s+xã|xã|phường|thành\s+phố|quận|đặc\s+khu)/i);
  if (!transitionMatch || transitionMatch.index === undefined) {
    return null;
  }

  const sourceSegment = sanitizeSourceSegment(fragment.slice(0, transitionMatch.index));
  const destinationTypeRaw = transitionMatch[1];
  const remainder = fragment.slice(transitionMatch.index + transitionMatch[0].length);
  const destinationNameMatch = remainder.match(/([^.;]+)/);
  const destinationNameRaw = destinationNameMatch ? destinationNameMatch[1] : remainder;

  const sources = extractSources(sourceSegment);
  if (sources.length === 0) {
    return null;
  }

  const target: ResolutionTarget = buildTarget(destinationNameRaw, destinationTypeRaw, fragment);

  return {
    from: sources,
    to: target,
    note: fragment.trim(),
    resolutionRef,
  };
}

function sanitizeSourceSegment(segment: string): string {
  let result = segment.trim();
  result = ensureUnitSpacing(result);
  result = result.replace(/^(sáp nhập|hợp nhất|nhập|điều chỉnh|tách|chuyển)/i, '');
  result = result.replace(/các\s*(thị trấn|thị xã|xã|phường)/gi, '$1');
  result = result.replace(/,\s*/g, ', ');
  result = result.replace(/\)\s*(?=(?:và|&))/gi, ') ');
  result = result.replace(/([^\s,])(?=(thị trấn|thị xã|xã|phường))/gi, '$1 ');
  result = result.replace(/\s+(?:và|&)+\s+/gi, ', ');
  result = result.replace(/(thị trấn|thị xã|xã|phường)([^,;]*?)\s+(?=(thị trấn|thị xã|xã|phường))/gi, (_, type, namePortion) => `${type}${namePortion}, `);
  result = ensureUnitSpacing(result);
  result = result.replace(/\s+,/g, ',');
  result = normalizeWhitespace(result);
  return result;
}

function extractSources(segment: string): ResolutionSource[] {
  const tokens = mergeParentheticalTokens(
    segment
    .split(/[;,]/)
    .map((token) => normalizeWhitespace(token))
    .filter((token) => token.length > 0),
  );

  const sources: ResolutionSource[] = [];
  let currentType: string | undefined;

  tokens.forEach((token) => {
    const strippedToken = stripLeadingContext(token);
    if (!strippedToken) {
      return;
    }

    const match = strippedToken.match(/(thị trấn|thị xã|xã|phường)\s+(.+)/i);

    if (match) {
      currentType = match[1];
      const source = buildSource(match[2], match[1]);
      if (source) {
        sources.push(source);
      }
      return;
    }

    if (!currentType) {
      return;
    }

    const implicitName = stripLeadingContext(token);
    if (!implicitName) {
      return;
    }

    const implicitSource = buildSource(implicitName, currentType);
    if (implicitSource) {
      sources.push(implicitSource);
    }
  });

  propagateParentContext(sources);

  return sources;
}

function mergeParentheticalTokens(initialTokens: string[]): string[] {
  if (initialTokens.length === 0) {
    return initialTokens;
  }

  const merged: string[] = [];
  let buffer = '';
  let balance = 0;

  initialTokens.forEach((token) => {
    const openCount = (token.match(/\(/g) ?? []).length;
    const closeCount = (token.match(/\)/g) ?? []).length;

    if (buffer) {
      buffer = `${buffer}, ${token}`;
    } else {
      buffer = token;
    }

    balance += openCount - closeCount;

    if (balance <= 0) {
      merged.push(normalizeWhitespace(buffer));
      buffer = '';
      balance = 0;
    }
  });

  if (buffer) {
    merged.push(normalizeWhitespace(buffer));
  }

  return merged;
}

function stripLeadingContext(value: string): string {
  let result = normalizeWhitespace(value);

  if (!result) {
    return result;
  }

  const simplifiedToken = normalizeWhitespace(stripAccents(result)).toLowerCase();
  if (simplifiedToken === 'm' || simplifiedToken === 'm.' || simplifiedToken === 'm..') {
    return '';
  }

    if (/^\d+$/.test(simplifiedToken.replace(/\u0000/g, ''))) {
    return '';
  }

  const patterns: RegExp[] = [
    /^(và|cùng|với)\s+/i,
    /^(toàn bộ|một phần|phần còn lại)\s+diện tích\s+tự nhiên,\s*quy\s+mô\s+dân\s+số\s+của\s+/i,
    /^(toàn bộ|một phần|phần còn lại)\s+diện tích\s+tự nhiên\s+của\s+/i,
    /^(toàn bộ|một phần|phần còn lại)\s+quy\s+mô\s+dân\s+số\s+của\s+/i,
    /^(toàn bộ|một phần|phần còn lại)\s+diện\s+tích,\s*quy\s+mô\s+dân\s+số\s+của\s+/i,
    /^diện\s+tích,\s*quy\s+mô\s+dân\s+số\s+của\s+/i,
    /^diện\s+tích\s+tự nhiên,\s*quy\s+mô\s+dân\s+số\s+của\s+/i,
    /^quy\s+mô\s+dân\s+số\s+của\s+/i,
    /^(một phần|phần còn lại)\s+/i,
    /^(của|thuộc)\s+/i,
    /^diện\s+tích(?:\s+tự\s+nhiên)?(?:,\s*quy\s+mô\s+dân\s+số)?\s*/i,
    /^quy\s+mô\s+dân\s+số\s*/i,
  ];

  let previous: string;
  do {
    previous = result;
    patterns.forEach((pattern) => {
      result = result.replace(pattern, '');
    });
    result = result.trim();
  } while (result && result !== previous);

  if (!result) {
    return result;
  }

  const simplified = normalizeWhitespace(stripAccents(result)).toLowerCase();
  const contextReferencePattern = /^(khoan|diem)\s+\d+(?:\s*,\s*(khoan|diem)\s+\d+)*(?:\s+[đd]ieu\s*nay)?$/;
  if (contextReferencePattern.test(simplified)) {
    return '';
  }

  return result;
}

function buildSource(namePortion: string, typePortion: string): ResolutionSource | null {
  const { name, parentName, parentType, lockParentContext } = splitParent(namePortion);
  const cleanedName = cleanupName(name, typePortion);
  if (!cleanedName) {
    return null;
  }

  return {
    raw: buildRawLabel(typePortion, cleanedName) ?? `${typePortion} ${cleanedName}`.trim(),
    name: cleanedName,
    normalizedName: normalizeName(cleanedName),
    type: detectKind(typePortion),
    parentName,
    normalizedParentName: parentName ? normalizeName(parentName) : undefined,
    parentType,
    parentContextLocked: lockParentContext,
  };
}

function buildTarget(namePortion: string, typePortion: string, rawClause: string): ResolutionTarget {
  const { name, parentName, parentType } = splitParent(namePortion);
  const cleanedName = cleanupName(name, typePortion);

  return {
    raw: buildRawLabel(typePortion, cleanedName) ?? rawClause,
    name: cleanedName,
    normalizedName: normalizeName(cleanedName),
    type: detectKind(typePortion),
    parentName,
    normalizedParentName: parentName ? normalizeName(parentName) : undefined,
    parentType,
  };
}

function buildRawLabel(typePortion: string | undefined, name: string): string | undefined {
  const components = [typePortion?.trim(), name.trim()].filter((value) => Boolean(value)) as string[];
  if (components.length === 0) {
    return undefined;
  }
  return components.join(' ');
}

function splitParent(raw: string): {
  name: string;
  parentName?: string;
  parentType?: ResolutionSource['parentType'];
  lockParentContext?: boolean;
} {
  let working = ensureUnitSpacing(raw).trim();
  const trailingContextPattern = /\s+(?:sau\s+khi|theo\s+quy\s+định|theo\s+quy\s+dinh)\b.*$/i;
  const trimmedForParent = working.replace(trailingContextPattern, '').trim();
  if (trimmedForParent) {
    working = trimmedForParent;
  }
  let parentName: string | undefined;
  let parentType: ResolutionSource['parentType'] | undefined;
  let lockParentContext = false;

  const parenMatch = working.match(/\(([^()]+)\)\s*$/);
  if (parenMatch && parenMatch.index !== undefined) {
    const extracted = extractParentFromText(parenMatch[1]);
    if (extracted.parentName) {
      parentName = extracted.parentName;
      parentType = extracted.parentType;
      working = working.slice(0, parenMatch.index).trim();
      lockParentContext = true;
    }
  }

  const parts = working.split(/\s+thuộc\s+/i);
  const name = parts[0];
  if (parts.length > 1) {
    const extracted = extractParentFromText(parts[1]);
    if (extracted.parentName) {
      parentName = extracted.parentName;
      parentType = extracted.parentType ?? parentType;
      lockParentContext = false;
    }
  }

  return { name, parentName, parentType, lockParentContext };
}

function cleanupName(raw: string, typeHint?: string): string {
  const normalizedRaw = ensureUnitSpacing(raw);
  const withoutParens = normalizedRaw.replace(/\([^)]*\)/g, '');
  const withoutQuotes = withoutParens.replace(/["“”]/g, '');
  const removedLeadAlias = withoutQuotes
    .replace(/^(mới\s+có\s+tên\s+gọi\s+là)\s+/i, '')
    .replace(/^(có\s+tên\s+gọi\s+là)\s+/i, '')
    .replace(/^(tên\s+gọi\s+là)\s+/i, '')
    .replace(/^(mới\s+đổi\s+tên\s+thành)\s+/i, '')
    .replace(/^(đổi\s+tên\s+thành)\s+/i, '');
  const removedLeadingType = removeLeadingType(removedLeadAlias, typeHint);
  const strippedConditions = removedLeadingType
    .replace(/(?:^|\s+)sau\s+khi\s+.+$/i, '')
    .replace(/(?:^|\s+)theo\s+quy\s+định.+$/i, '')
    .replace(/(?:^|\s+)theo\s+quy\s+dinh.+$/i, '');
  const removedTrailing = strippedConditions.replace(/\s+(cũ|hiện nay)$/i, '');
  const simplified = normalizeWhitespace(stripAccents(removedTrailing)).toLowerCase();
  const genericTypeTokens = new Set(['thi tran', 'thi xa', 'xa', 'phuong', 'thanh pho', 'quan', 'huyen', 'dac khu']);
  if (genericTypeTokens.has(simplified)) {
    return '';
  }
  const contextReferencePattern = /^(khoan|diem)\s+\d+(?:\s*,\s*(khoan|diem)\s+\d+)*(?:\s+[đd]ieu\s*nay)?$/;
  if (contextReferencePattern.test(simplified)) {
    return '';
  }
  const numericClauseReferencePattern = /^\d+\s+[đd]ieu\s*nay$/;
  if (numericClauseReferencePattern.test(simplified)) {
    return '';
  }
  const simplifiedWithoutType = simplified.replace(
    /^(thi tran|thi xa|xa|phuong|thanh pho|quan|huyen)\s+/,
    '',
  );
  if (contextReferencePattern.test(simplifiedWithoutType)) {
    return '';
  }
  if (numericClauseReferencePattern.test(simplifiedWithoutType)) {
    return '';
  }
  return normalizeWhitespace(removedTrailing);
}

function ensureUnitSpacing(value: string): string {
  if (!value) {
    return value;
  }

  let result = value.replace(BASIC_UNIT_TOKENS, (match) => normalizeWhitespace(match));
  result = result.replace(/(thị trấn|thị xã|xã|phường|thành phố|quận|huyện)(?=\p{Lu})/giu, '$1 ');
  result = result.replace(/\b(thị trấn|thị xã|xã|phường|thành phố|quận|huyện)\s+(thị trấn|thị xã|xã|phường|thành phố|quận|huyện)\b/gi, '$2');
  return result;
}

function removeLeadingType(value: string, typeHint?: string): string {
  const base = normalizeWhitespace(value);
  if (!base) {
    return base;
  }

  if (typeHint) {
    const trimmedType = normalizeWhitespace(typeHint);
    if (trimmedType) {
      const typeWords = trimmedType.split(/\s+/);
      const candidateWords = base.split(/\s+/);

      if (candidateWords.length > typeWords.length) {
        const leadingLiteral = candidateWords.slice(0, typeWords.length).join(' ');
        if (leadingLiteral.toLowerCase() === trimmedType.toLowerCase()) {
          return candidateWords.slice(typeWords.length).join(' ');
        }
      }
    }
  }

  return base.replace(/^(thị trấn|thị xã|xã|phường|thành phố|quận|huyện|đặc khu)\s+/i, '');
}

interface ParentContext {
  parentName: string;
  normalizedParentName: string;
  parentType?: ResolutionSource['parentType'];
  type?: AdministrativeUnitKind;
}

function propagateParentContext(sources: ResolutionSource[]): void {
  if (sources.length === 0) {
    return;
  }

  let forwardContext: ParentContext | undefined;
  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    if (source.parentName) {
      forwardContext = buildParentContext(source);
    } else if (forwardContext && (!source.type || !forwardContext.type || source.type === forwardContext.type)) {
      sources[index] = applyParentContext(source, forwardContext);
    } else {
      forwardContext = undefined;
    }
  }

  let backwardContext: ParentContext | undefined;
  for (let index = sources.length - 1; index >= 0; index -= 1) {
    const source = sources[index];
    if (source.parentName) {
      backwardContext = buildParentContext(source);
    } else if (backwardContext && (!source.type || !backwardContext.type || source.type === backwardContext.type)) {
      sources[index] = applyParentContext(source, backwardContext);
    } else {
      backwardContext = undefined;
    }
  }
}

function buildParentContext(source: ResolutionSource): ParentContext | undefined {
  if (!source.parentName) {
    return undefined;
  }
  return {
    parentName: source.parentName,
    normalizedParentName: source.normalizedParentName ?? normalizeName(source.parentName),
    parentType: source.parentType,
    type: source.type,
  };
}

function applyParentContext(source: ResolutionSource, context: ParentContext): ResolutionSource {
  if (source.parentName) {
    return source;
  }
  return {
    ...source,
    parentName: context.parentName,
    normalizedParentName: context.normalizedParentName,
    parentType: context.parentType,
  };
}

function extractParentFromText(raw: string): { parentName?: string; parentType?: ResolutionSource['parentType'] } {
  const trimmed = normalizeWhitespace(raw);
  if (!trimmed) {
    return {};
  }

  const normalized = normalizeName(trimmed);
  const normalizedMatch = normalized.match(/^(huyen|thi xa|thanh pho|quan|tinh)\s+(.+)/);
  if (normalizedMatch) {
    const parentType = toParentType(normalizedMatch[1]);
    const parentName = cleanupName(trimmed);
    return {
      parentName,
      parentType,
    };
  }

  return {
    parentName: cleanupName(trimmed),
  };
}

function detectKind(rawType?: string): AdministrativeUnitKind | undefined {
  if (!rawType) {
    return undefined;
  }
  const normalized = normalizeName(rawType);
  switch (normalized) {
    case 'thi tran':
      return 'thi_tran';
    case 'thi xa':
      return 'thi_xa';
    case 'xa':
      return 'xa';
    case 'phuong':
      return 'phuong';
    case 'quan':
      return 'quan';
    case 'huyen':
      return 'huyen';
    case 'thanh pho':
      return 'thanh_pho';
    default:
      return undefined;
  }
}

function toParentType(raw: string): ResolutionSource['parentType'] {
  const normalized = normalizeName(raw);
  switch (normalized) {
    case 'huyen':
      return 'huyen';
    case 'thi xa':
      return 'thi_xa';
    case 'thanh pho':
      return 'thanh_pho';
    case 'quan':
      return 'quan';
    case 'tinh':
      return 'tinh';
    default:
      return undefined;
  }
}

export function clauseContainsAdministrativeUnit(fragment: string): boolean {
  return UNIT_PATTERN.test(stripAccents(fragment));
}
