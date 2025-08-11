import type { UIScanGroup } from '../main/scan';

export type UIState = {
  groups: UIScanGroup[];
  selectedId: string | null;
  selectedMatch: { id: string; name: string } | null;
  hasMore: boolean;
  page: number;
  pageSize: number;
  heavy: boolean;
  stats: { textNodes: number; segments: number; groupsTotal: number } | null;
};

export const state: UIState = {
  groups: [],
  selectedId: null,
  selectedMatch: null,
  hasMore: false,
  page: 0,
  pageSize: 50,
  heavy: false,
  stats: null
};
