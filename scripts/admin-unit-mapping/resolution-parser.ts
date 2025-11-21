import { normalizeName, normalizeWhitespace, stripAccents } from './normalize';
import { AdministrativeUnitKind, ResolutionClause, ResolutionSource, ResolutionTarget } from './types';

const CLAUSE_SPLIT_REGEX = /(?<=[.;])\s+|\n+/;
const UNIT_PATTERN = /(thị trấn|thị xã|xã|phường|thành phố|quận|huyện)/i;

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
  result = result.replace(/^(sáp nhập|hợp nhất|nhập|điều chỉnh|tách|chuyển)/i, '');
  result = result.replace(/các\s*(thị trấn|thị xã|xã|phường)/gi, '$1');
  result = result.replace(/,\s*/g, ', ');
  result = result.replace(/([^\s,])(?=(thị trấn|thị xã|xã|phường))/gi, '$1 ');
  result = result.replace(/\s*(?:và|&)+\s*/gi, ', ');
  result = result.replace(/\s+,/g, ',');
  result = normalizeWhitespace(result);
  return result;
}

function extractSources(segment: string): ResolutionSource[] {
  const matches = [...segment.matchAll(/(thị trấn|thị xã|xã|phường)\s+([^,;]+)/gi)];
  const sources = matches
    .map((match) => buildSource(match[2], match[1]))
    .filter((source): source is ResolutionSource => Boolean(source));

  propagateParentContext(sources);

  return sources;
}

function buildSource(namePortion: string, typePortion: string): ResolutionSource | null {
  const { name, parentName, parentType } = splitParent(namePortion);
  const cleanedName = cleanupName(name);
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
  };
}

function buildTarget(namePortion: string, typePortion: string, rawClause: string): ResolutionTarget {
  const { name, parentName, parentType } = splitParent(namePortion);
  const cleanedName = cleanupName(name);

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

function splitParent(raw: string): { name: string; parentName?: string; parentType?: ResolutionSource['parentType'] } {
  let working = raw.trim();
  let parentName: string | undefined;
  let parentType: ResolutionSource['parentType'] | undefined;

  const parenMatch = working.match(/\(([^()]+)\)\s*$/);
  if (parenMatch && parenMatch.index !== undefined) {
    const extracted = extractParentFromText(parenMatch[1]);
    if (extracted.parentName) {
      parentName = extracted.parentName;
      parentType = extracted.parentType;
      working = working.slice(0, parenMatch.index).trim();
    }
  }

  const parts = working.split(/\s+thuộc\s+/i);
  const name = parts[0];
  if (parts.length > 1) {
    const extracted = extractParentFromText(parts[1]);
    if (extracted.parentName) {
      parentName = extracted.parentName;
      parentType = extracted.parentType ?? parentType;
    }
  }

  return { name, parentName, parentType };
}

function cleanupName(raw: string): string {
  const withoutParens = raw.replace(/\([^)]*\)/g, '');
  const withoutQuotes = withoutParens.replace(/["“”]/g, '');
  const removedLeadAlias = withoutQuotes
    .replace(/^(mới\s+có\s+tên\s+gọi\s+là)\s+/i, '')
    .replace(/^(có\s+tên\s+gọi\s+là)\s+/i, '')
    .replace(/^(tên\s+gọi\s+là)\s+/i, '')
    .replace(/^(mới\s+đổi\s+tên\s+thành)\s+/i, '')
    .replace(/^(đổi\s+tên\s+thành)\s+/i, '');
  const removedLeadingType = removedLeadAlias.replace(/^(thị trấn|thị xã|xã|phường|thành phố|quận|huyện|thi tran|thi xa|phuong|thanh pho|quan|huyen)\s+/i, '');
  const strippedConditions = removedLeadingType
    .replace(/\s+sau\s+khi\s+.+$/i, '')
    .replace(/\s+theo\s+quy\s+định.+$/i, '')
    .replace(/\s+theo\s+quy\s+dinh.+$/i, '');
  const removedTrailing = strippedConditions.replace(/\s+(cũ|hiện nay)$/i, '');
  return normalizeWhitespace(removedTrailing);
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
