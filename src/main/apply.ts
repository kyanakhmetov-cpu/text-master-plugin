import { fpFromProps, coalesceRanges } from './utils/styles';
import { pageOf } from './utils/figma';
import { getGroupBucket } from './scan';

export async function applyGroup(groupKey: string, styleName: string, useExisting: boolean, existingStyleId: string | null) {
  const group = getGroupBucket(groupKey);
  if (!group) {
    figma.notify('Группа не найдена. Пересканируй документ.');
    return { applied: 0, usedExisting: false, usedExistingName: '', createdOrUpdatedName: '' };
  }
  const sample = group.sample;

  const fontsToLoad: Record<string, true> = {};
  fontsToLoad[JSON.stringify(sample.fontName)] = true;
  for (let i = 0; i < group.segs.length; i++) {
    const fn = group.segs[i].fontName;
    if (fn) fontsToLoad[JSON.stringify(fn)] = true;
  }
  for (const key in fontsToLoad) {
    if (Object.prototype.hasOwnProperty.call(fontsToLoad, key)) {
      await figma.loadFontAsync(JSON.parse(key));
    }
  }

  let chosen: TextStyle | null = null;
  let chosenFromExisting = false;

  if (useExisting && existingStyleId) {
    const ex = figma.getStyleById(existingStyleId);
    if (ex && ex.type === 'TEXT') {
      chosen = ex as TextStyle;
      chosenFromExisting = true;
    }
  }

  const sampleKey = fpFromProps(sample);
  if (!chosen) {
    const locals = await figma.getLocalTextStylesAsync();
    for (let j = 0; j < locals.length; j++) {
      const ts = locals[j];
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
      if (fpFromProps(props) === sampleKey) {
        chosen = ts;
        break;
      }
    }
  }

  if (!chosen || !(useExisting || chosenFromExisting)) {
    if (!chosen) {
      const locals = await figma.getLocalTextStylesAsync();
      for (let k = 0; k < locals.length; k++) {
        if (locals[k].name === styleName) {
          chosen = locals[k];
          break;
        }
      }
      if (!chosen) {
        chosen = figma.createTextStyle();
        chosen.name = styleName;
      }
    }
    chosen.fontName = sample.fontName;
    chosen.fontSize = sample.fontSize;
    chosen.lineHeight = sample.lineHeight;
    chosen.letterSpacing = { unit: sample.letterSpacing.unit, value: sample.letterSpacing.value };
    chosen.paragraphSpacing = sample.paragraphSpacing;
    chosen.paragraphIndent = sample.paragraphIndent;
    chosen.textCase = sample.textCase;
    chosen.textDecoration = sample.textDecoration;
  }

  const segsByNode = new Map<TextNode, Array<{ start: number; end: number }>>();
  for (let m = 0; m < group.segs.length; m++) {
    const seg = group.segs[m];
    if (!segsByNode.has(seg.node)) segsByNode.set(seg.node, []);
    const list = segsByNode.get(seg.node);
    if (list) list.push({ start: seg.start, end: seg.end });
  }

  let applied = 0;
  let processedNodes = 0;
  const iter = segsByNode.entries();
  let next = iter.next();
  while (!next.done) {
    const pair = next.value;
    const node = pair[0];
    const ranges = pair[1];
    const merged = coalesceRanges(ranges);
    for (let r = 0; r < merged.length; r++) {
      const range = merged[r];
      try {
        await node.setRangeTextStyleIdAsync(range.start, range.end, (chosen as TextStyle).id);
        applied++;
      } catch (_e) {
        // пропускаем недоступные узлы
      }
    }
    processedNodes++;
    if (processedNodes % 20 === 0) {
      await new Promise(function (res) {
        setTimeout(res, 0);
      });
    }
    next = iter.next();
  }

  const uniqueNodes = Array.from(segsByNode.keys());
  const onCurrent: TextNode[] = [];
  for (let q = 0; q < uniqueNodes.length; q++) {
    const pg = pageOf(uniqueNodes[q]);
    if (pg === figma.currentPage) onCurrent.push(uniqueNodes[q]);
  }
  if (onCurrent.length) figma.currentPage.selection = onCurrent;

  const usedExistingName = chosenFromExisting ? ((chosen as TextStyle).name || '') : '';
  const createdOrUpdatedName = !chosenFromExisting ? ((chosen as TextStyle).name || '') : '';
  figma.notify('Готово: применено к ' + String(applied) + ' фрагментам');

  return {
    applied,
    usedExisting: chosenFromExisting,
    usedExistingName,
    createdOrUpdatedName
  };
}
