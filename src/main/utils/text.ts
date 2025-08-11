/** Заменяет PIXELS/PERCENT на px/% */
export function formatUnit(value: string): string {
  return value.replace('PIXELS', 'px').replace('PERCENT', '%');
}

/** Обрезает строку до maxLen, добавляя "…" */
export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

/** Форматирует lineHeight с автообработкой AUTO */
export function formatLineHeight(lh: string | 'AUTO'): string {
  if (lh === 'AUTO') return 'AUTO';
  return formatUnit(String(lh));
}

/** Форматирует letterSpacing */
export function formatLetterSpacing(ls: string): string {
  return formatUnit(ls);
}
