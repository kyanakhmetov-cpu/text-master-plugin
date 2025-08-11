const STYLE_BY_ID = new Map<string, BaseStyle>();

export function pageOf(node: SceneNode): PageNode | null {
  let p: BaseNode | null = node.parent;
  while (p && p.type !== 'PAGE') p = p.parent;
  return p && p.type === 'PAGE' ? (p as PageNode) : null;
}

export function styleNameById(styleId: string | null): string | null {
  if (!styleId) return null;
  if (STYLE_BY_ID.has(styleId)) {
    const s = STYLE_BY_ID.get(styleId);
    return s ? s.name || null : null;
  }
  const s = figma.getStyleById(styleId);
  if (s) {
    STYLE_BY_ID.set(styleId, s);
    return s.name || null;
  }
  return null;
}

export async function collectTextNodes(scope: 'selection' | 'page' | 'document'): Promise<TextNode[]> {
  if (scope === 'selection') {
    const sel = figma.currentPage.selection;
    if (!sel || sel.length === 0) return [];
    const nodes: TextNode[] = [];
    const stack: ReadonlyArray<SceneNode>[] = [sel];
    while (stack.length) {
      const top = stack.pop();
      if (!top) continue;
      for (let i = 0; i < top.length; i++) {
        const n = top[i];
        if (n.type === 'TEXT') nodes.push(n as TextNode);
        if ('children' in n) {
          const children = (n as ChildrenMixin).children;
          if (children && children.length) stack.push(children);
        }
      }
    }
    return nodes;
  }
  if (scope === 'page') {
    return figma.currentPage.findAll(function (n) {
      return n.type === 'TEXT';
    }) as TextNode[];
  }
  if (scope === 'document') {
    await figma.loadAllPagesAsync();
    return figma.root.findAll(function (n) {
      return n.type === 'TEXT';
    }) as TextNode[];
  }
  return [];
}
