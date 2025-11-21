import { normalizeWhitespace } from './normalize';

function cleanupName(raw: string): string {
  const withoutParens = raw.replace(/\([^)]*\)/g, '');
  const withoutQuotes = withoutParens.replace(/["“”]/g, '');
  const removedLeadAlias = withoutQuotes
    .replace(/^(mới\s+có\s+tên\s+gọi\s+là)\s+/i, '')
    .replace(/^(có\s+tên\s+gọi\s+là)\s+/i, '')
    .replace(/^(tên\s+gọi\s+là)\s+/i, '')
    .replace(/^(mới\s+đổi\s+tên\s+thành)\s+/i, '')
    .replace(/^(đổi\s+tên\s+thành)\s+/i, '');
  const removedLeadingType = removedLeadAlias.replace(/^(thị trấn|thị xã|xã|phường|thành phố|quận|huyện)\s+/i, '');
  const strippedConditions = removedLeadingType
    .replace(/\s+sau\s+khi\s+.+$/i, '')
    .replace(/\s+theo\s+quy\s+định.+$/i, '')
    .replace(/\s+theo\s+quy\s+dinh.+$/i, '');
  const removedTrailing = strippedConditions.replace(/\s+(mới|cũ|hiện nay)$/i, '');
  return normalizeWhitespace(removedTrailing);
}

const samples = [
  'Phú Thành thành xã mới có tên gọi là xã Chợ Vàm',
  'xã Phú Thành',
  'Phú Thạnh',
];

samples.forEach((sample) => {
  console.log(sample, '=>', cleanupName(sample));
});
