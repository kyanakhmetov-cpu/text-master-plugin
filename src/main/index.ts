import { doScan, nextPage } from './scan';
import { applyGroup } from './apply';

figma.showUI(__html__, { width: 520, height: 500 });

type Incoming =
  | { type: 'scan'; scope: 'selection' | 'page' | 'document'; pageSize: number }
  | { type: 'scan-more' }
  | { type: 'apply'; groupId: string; styleName: string; useExisting: boolean; existingStyleId: string | null };

figma.ui.onmessage = async function (msg: Incoming) {
  try {
    if (msg.type === 'scan') {
      await doScan(msg.scope, msg.pageSize || 50);
      const first = nextPage();
      figma.ui.postMessage({
        type: 'scan-result',
        groups: first.groups,
        page: 0,
        pageSize: first.pageSize,
        hasMore: first.hasMore,
        heavy: first.heavy,
        stats: first.stats
      });
      return;
    }
    if (msg.type === 'scan-more') {
      const page = nextPage();
      figma.ui.postMessage({
        type: 'scan-result',
        groups: page.groups,
        page: page.page,
        pageSize: page.pageSize,
        hasMore: page.hasMore,
        heavy: page.heavy,
        stats: page.stats
      });
      return;
    }
    if (msg.type === 'apply') {
      const res = await applyGroup(msg.groupId, msg.styleName, msg.useExisting === true, msg.existingStyleId);
      figma.ui.postMessage({
        type: 'done',
        applied: res.applied,
        usedExisting: res.usedExisting,
        usedExistingName: res.usedExistingName,
        createdOrUpdatedName: res.createdOrUpdatedName
      });
      return;
    }
  } catch (e: any) {
    const text = e && e.message ? e.message : String(e);
    figma.notify('Ошибка: ' + text);
    figma.ui.postMessage({ type: 'error', message: text });
  }
};
