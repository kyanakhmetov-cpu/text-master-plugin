const MIX = figma.mixed;

export type LineHeight =
  | { unit: 'AUTO' }
  | { unit: 'PIXELS' | 'PERCENT'; value: number };

export type LetterSpacing = { unit: 'PIXELS' | 'PERCENT'; value: number };

export function normalizeLineHeight(lh: TextNode['lineHeight']): LineHeight {
  if (!lh || lh === MIX) return { unit: 'AUTO' };
  if (lh.unit === 'AUTO') return { unit: 'AUTO' };
  return { unit: lh.unit, value: Number(lh.value) };
}

export function normalizeLetterSpacing(ls: TextNode['letterSpacing']): LetterSpacing {
  if (!ls || ls === MIX) return { unit: 'PIXELS', value: 0 };
  return { unit: ls.unit, value: typeof ls.value === 'number' ? ls.value : 0 };
}

export function fpFromProps(props: {
  fontName: FontName;
  fontSize: number;
  lineHeight: TextNode['lineHeight'];
  letterSpacing: TextNode['letterSpacing'];
  paragraphSpacing: number;
  paragraphIndent: number;
  textCase: TextCase;
  textDecoration: TextDecoration;
}): string {
  const lh = normalizeLineHeight(props.lineHeight);
  const ls = normalizeLetterSpacing(props.letterSpacing);
  return JSON.stringify({
    fam: props.fontName.family,
    style: props.fontName.style,
    fs: props.fontSize,
    lh: lh,
    ls: ls,
    psp: props.paragraphSpacing,
    pind: props.paragraphIndent,
    tcase: props.textCase,
    tdec: props.textDecoration
  });
}

export function coalesceRanges(
  ranges: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
  if (!ranges || ranges.length === 0) return [];
  const sorted = ranges.slice().sort(function (a, b) {
    return a.start - b.start;
  });
  const res: Array<{ start: number; end: number }> = [];
  let cur = { start: sorted[0].start, end: sorted[0].end };
  for (let i = 1; i < sorted.length; i++) {
    const r = sorted[i];
    if (r.start <= cur.end) {
      if (r.end > cur.end) cur.end = r.end;
    } else if (r.start === cur.end) {
      cur.end = r.end;
    } else {
      res.push(cur);
      cur = { start: r.start, end: r.end };
    }
  }
  res.push(cur);
  return res;
}
