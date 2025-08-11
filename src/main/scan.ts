import { collectTextNodes, styleNameById } from './utils/figma';
import { normalizeLetterSpacing, normalizeLineHeight, fpFromProps } from './utils/styles';

export type UIScanGroup = {
  id: string;
  count: number;
  styled: boolean;
  styleId: string | null;
  styleName: string | null;
  matches: Array<{ id: string; name: string }>;
  preview: {
    title: string;
    family: string;
    style: string;
    size: number;
    lineHeight: string | 'AUTO';
    letterSpacing: string;
    paragraphSpacing: number;
    paragraphIndent: number;
    textCase: TextCase;
    textDecoration: TextDecoration;
  };
};

type GroupBucket = {
  segs: Array<{ node: TextNode; start: number; end: number; fontName: FontName }>;
  sample: {
    fontName: FontName;
    fontSize: number;
    lineHeight: TextNode['lineHeight'];
    letterSpacing: TextNode['letterSpacing'];
    paragraphSpacing: number;
    paragraphIndent: number;
    textCase: TextCase;
    textDecoration: TextDecoration;
  };
  fp: string;
  styled: boolean;
  styleId: string | null;
};

const STYLES_BY_FP = new Map<string, TextStyle[]>();
let GROUPS = new Map<string, GroupBucket>();

export const SCAN_CACHE = {
  payloadSorted: [] as UIScanGroup[],
  cursor: 0,
  pageSize: 50,
  stats: { textNodes: 0, segments: 0, groupsTotal: 0 },
  heavy: false
};

export async function doScan(scope: 'selection' | 'page' | 'document', pageSize: number) {
  STYLES_BY_FP.clear();
  GROUPS = new Map();

  const localTextStyles = await figma.getLocalTextStylesAsync();
  for (let i = 0; i < localTextStyles.length; i++) {
    const ts = localTextStyles[i];
    const props = {
      fontName: ts.fontName,
      fontSize: ts.fontSize,
      lineHeight: ts.lineHeight,
      letterSpacing: ts.letterSpacing,
      paragraphSpacing: ts.paragraphSpacing,
      paragraphIndent: ts.paragraphIndent,
      textCase: ts.textCase,
      textDecoration: ts.textDecoration
    };
    const key = fpFromProps(props);
    if (!STYLES_BY_FP.has(key)) STYLES_BY_FP.set(key, []);
    const arr = STYLES_BY_FP.get(key);
    if (arr) arr.push(ts);
  }

  const allText = await collectTextNodes(scope);
  let totalSegments = 0;

  for (let j = 0; j < allText.length; j++) {
    const node = allText[j];
    let segs: Array<any>;
    try {
      segs = node.getStyledTextSegments([
        'fontName',
        'fontSize',
        'lineHeight',
        'letterSpacing',
        'paragraphSpacing',
        'paragraphIndent',
        'textCase',
        'textDecoration',
        'textStyleId'
      ]) as Array<any>;
    } catch (_e) {
      continue;
    }
    totalSegments += segs.length;

    for (let k = 0; k < segs.length; k++) {
      const s = segs[k];
      if (!s || !s.fontName || typeof s.fontSize !== 'number') continue;

      const props2 = {
        fontName: s.fontName as FontName,
        fontSize: s.fontSize as number,
        lineHeight: s.lineHeight as TextNode['lineHeight'],
        letterSpacing: s.letterSpacing as TextNode['letterSpacing'],
        paragraphSpacing: s.paragraphSpacing as number,
        paragraphIndent: s.paragraphIndent as number,
        textCase: s.textCase as TextCase,
        textDecoration: s.textDecoration as TextDecoration
      };
      const fpKey = fpFromProps(props2);
      const hasStyle = Boolean(s.textStyleId && typeof s.textStyleId === 'string');
      const groupKey = hasStyle ? 'style:' + String(s.textStyleId) : 'fp:' + fpKey;

      if (!GROUPS.has(groupKey)) {
        GROUPS.set(groupKey, {
          segs: [],
          sample: props2,
          fp: fpKey,
          styled: hasStyle,
          styleId: hasStyle ? String(s.textStyleId) : null
        });
      }
      const g = GROUPS.get(groupKey);
      if (g) g.segs.push({ node: node, start: s.start as number, end: s.end as number, fontName: s.fontName as FontName });
    }
  }

  const payload: UIScanGroup[] = [];
  GROUPS.forEach(function (g, key) {
    const n = g.sample;
    const lh = normalizeLineHeight(n.lineHeight);
    const ls = normalizeLetterSpacing(n.letterSpacing);

    const styledName = g.styled ? styleNameById(g.styleId) : null;
    const title = g.styled && styledName ? styledName : n.fontName.family + ' ' + n.fontName.style + ', ' + String(n.fontSize);

    const matchList: Array<{ id: string; name: string }> = [];
    if (STYLES_BY_FP.has(g.fp)) {
      const arr = STYLES_BY_FP.get(g.fp);
      if (arr && arr.length) {
        for (let i = 0; i < arr.length; i++) {
          matchList.push({ id: arr[i].id, name: arr[i].name });
        }
      }
    }

    payload.push({
      id: key,
      count: g.segs.length,
      styled: g.styled,
      styleId: g.styleId,
      styleName: styledName,
      matches: matchList,
      preview: {
        title: title,
        family: n.fontName.family,
        style: n.fontName.style,
        size: n.fontSize,
        lineHeight: lh.unit === 'AUTO' ? 'AUTO' : String(lh.value) + ' ' + lh.unit,
        letterSpacing: String(ls.value) + ' ' + ls.unit,
        paragraphSpacing: n.paragraphSpacing,
        paragraphIndent: n.paragraphIndent,
        textCase: n.textCase,
        textDecoration: n.textDecoration
      }
    });
  });

  payload.sort(function (a, b) {
    if (a.styled !== b.styled) return a.styled ? -1 : 1;
    return b.count - a.count;
  });

  SCAN_CACHE.payloadSorted = payload;
  SCAN_CACHE.cursor = 0;
  SCAN_CACHE.pageSize = pageSize;
  SCAN_CACHE.stats = {
    textNodes: allText.length,
    segments: totalSegments,
    groupsTotal: payload.length
  };
  const HEAVY_TEXT_NODES = 2000;
  const HEAVY_SEGMENTS = 5000;
  SCAN_CACHE.heavy = allText.length >= HEAVY_TEXT_NODES || totalSegments >= HEAVY_SEGMENTS;
}

export function nextPage(): {
  groups: UIScanGroup[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  heavy: boolean;
  stats: typeof SCAN_CACHE.stats;
} {
  const start = SCAN_CACHE.cursor;
  const end = Math.min(SCAN_CACHE.cursor + SCAN_CACHE.pageSize, SCAN_CACHE.payloadSorted.length);
  const slice = SCAN_CACHE.payloadSorted.slice(start, end);
  SCAN_CACHE.cursor = end;

  return {
    groups: slice,
    page: Math.floor(start / SCAN_CACHE.pageSize),
    pageSize: SCAN_CACHE.pageSize,
    hasMore: SCAN_CACHE.cursor < SCAN_CACHE.payloadSorted.length,
    heavy: SCAN_CACHE.heavy,
    stats: SCAN_CACHE.stats
  };
}

export function getGroupBucket(groupKey: string): GroupBucket | null {
  return GROUPS.has(groupKey) ? (GROUPS.get(groupKey) as GroupBucket) : null;
}
