const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;
const PUNCTUATION_TO_SCRUB = /[-.'’]/g;
const MULTIPLE_SPACES = /\s+/g;
const TONE_MARKS = /[\u0300\u0301\u0303\u0309\u0323\u0340\u0341]/g;

const ROMAN_NUMERAL_ENTRIES: Array<[string, string]> = [
  ['XX', '20'],
  ['XIX', '19'],
  ['XVIII', '18'],
  ['XVII', '17'],
  ['XVI', '16'],
  ['XV', '15'],
  ['XIV', '14'],
  ['XIII', '13'],
  ['XII', '12'],
  ['XI', '11'],
  ['X', '10'],
  ['IX', '9'],
  ['VIII', '8'],
  ['VII', '7'],
  ['VI', '6'],
  ['V', '5'],
  ['IV', '4'],
  ['III', '3'],
  ['II', '2'],
  ['I', '1'],
];

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(COMBINING_DIACRITICS, '');
}

export function stripToneMarks(value: string): string {
  return value.normalize('NFD').replace(TONE_MARKS, '').normalize('NFC');
}

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(MULTIPLE_SPACES, ' ');
}

export function normalizeName(value: string): string {
  const withoutAccents = stripAccents(value).toLowerCase();
  const withArabicNumerals = replaceRomanNumerals(withoutAccents);
  const scrubbed = withArabicNumerals.replace(PUNCTUATION_TO_SCRUB, ' ');
  const cleaned = scrubbed.replace(/\./g, ' ').replace(/,/g, ' ');
  return normalizeWhitespace(cleaned);
}

function replaceRomanNumerals(value: string): string {
  let result = value;
  ROMAN_NUMERAL_ENTRIES.forEach(([roman, digit]) => {
    const romanRegex = new RegExp(`\\b${roman}\\b`, 'gi');
    result = result.replace(romanRegex, digit);
  });
  return result;
}
