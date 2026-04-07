import type { SalesOrderLive, SalesOrderPipeline } from '../types/sales.types';
import type { SoChildToParentMap } from '../types/sales-grouping.types';
import {
  parseDateSafe,
  parseDateToMonthKey,
  parseDateToYear,
  plannedCycleDaysLive,
} from './sales-utils';

function isPipelineSetupOrder(o: SalesOrderPipeline): boolean {
  return (o.status || '').trim().toLowerCase() === 'setup';
}

/** Üst zinciri takip ederek kök record_id. Bozuk döngüde id döner. */
export function getRootRecordId(recordId: string, parentByChild: SoChildToParentMap): string {
  let cur = recordId;
  const seen = new Set<string>();
  while (parentByChild[cur]) {
    if (seen.has(cur)) return recordId;
    seen.add(cur);
    cur = parentByChild[cur];
  }
  return cur;
}

export function pruneParentMap(
  parentByChild: SoChildToParentMap,
  validIds: ReadonlySet<string>
): SoChildToParentMap {
  const next: SoChildToParentMap = {};
  for (const [child, parent] of Object.entries(parentByChild)) {
    if (!validIds.has(child) || !validIds.has(parent)) continue;
    if (child === parent) continue;
    next[child] = parent;
  }
  return next;
}

export type LinkSoParentResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Alt SO → ana SO bağlantısı doğrulaması.
 * parentId null: bağ kaldırma (child map’ten silinir) — burada sadece null parent için child varlığı kontrolü.
 */
export function validateSoParentLink(
  parentByChild: SoChildToParentMap,
  childId: string,
  parentId: string | null,
  validIds: ReadonlySet<string>
): LinkSoParentResult {
  if (parentId === null) return { ok: true };
  if (!validIds.has(childId)) return { ok: false, reason: 'Child order not found.' };
  if (!validIds.has(parentId)) return { ok: false, reason: 'Parent order not found.' };
  if (childId === parentId) return { ok: false, reason: 'An order cannot be its own parent.' };

  const next: SoChildToParentMap = { ...parentByChild, [childId]: parentId };
  let cur: string | undefined = parentId;
  const seen = new Set<string>();
  while (cur) {
    if (seen.has(cur)) return { ok: false, reason: 'Cycle detected in hierarchy.' };
    seen.add(cur);
    if (cur === childId) return { ok: false, reason: 'Cannot attach: would create a cycle.' };
    cur = next[cur];
  }
  return { ok: true };
}

/** Kök satırın Due Date’i; yoksa üyeler arasında en geç parse edilebilen due_date. */
export function groupRepresentativeDueDateStr(
  root: SalesOrderLive | SalesOrderPipeline | undefined,
  members: ReadonlyArray<SalesOrderLive | SalesOrderPipeline>
): string {
  const rootDue = (root?.due_date || '').trim();
  if (rootDue && parseDateSafe(rootDue)) return rootDue;
  let best: string | null = null;
  let bestT = -Infinity;
  for (const m of members) {
    const s = (m.due_date || '').trim();
    const d = parseDateSafe(s);
    if (!d) continue;
    const t = d.getTime();
    if (t >= bestT) {
      bestT = t;
      best = s;
    }
  }
  return best ?? '';
}

/** Grup PM: kök satırın project_manager; kök yoksa çoğunluk. */
export function groupRepresentativePm(
  root: SalesOrderLive | SalesOrderPipeline | undefined,
  members: ReadonlyArray<SalesOrderLive | SalesOrderPipeline>
): string {
  const p = (root?.project_manager || '').trim();
  if (p) return p;
  const counts = new Map<string, number>();
  for (const m of members) {
    const k = (m.project_manager || '').trim() || 'Unassigned';
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best = 'Unassigned';
  let n = 0;
  for (const [k, c] of counts) {
    if (c > n) {
      n = c;
      best = k;
    }
  }
  return best;
}

export interface LiveGroupUnit {
  groupRootId: string;
  memberRecordIds: string[];
  members: SalesOrderLive[];
  rootOrder: SalesOrderLive | undefined;
  summedGrandTotal: number;
  representativeDueDateStr: string;
  representativePm: string;
  /** Tek proje için planned gün (kök satır; yoksa ilk üye). */
  plannedDaysForMetrics: number | null;
  closeMonthKeyForMetrics: string | null;
}

export interface PipelineGroupUnit {
  groupRootId: string;
  memberRecordIds: string[];
  members: SalesOrderPipeline[];
  rootOrder: SalesOrderPipeline | undefined;
  summedGrandTotal: number;
  representativePm: string;
  /** Grupta en az bir Setup var mı */
  hasSetup: boolean;
}

function indexById<T extends { record_id: string }>(rows: ReadonlyArray<T>): Map<string, T> {
  const m = new Map<string, T>();
  for (const r of rows) m.set(r.record_id, r);
  return m;
}

export function buildLiveGroupUnits(
  orders: ReadonlyArray<SalesOrderLive>,
  parentByChild: SoChildToParentMap
): LiveGroupUnit[] {
  const byId = indexById(orders);
  const roots = new Map<string, Set<string>>();
  for (const o of orders) {
    const r = getRootRecordId(o.record_id, parentByChild);
    if (!roots.has(r)) roots.set(r, new Set());
    roots.get(r)!.add(o.record_id);
  }

  const units: LiveGroupUnit[] = [];
  for (const [groupRootId, idSet] of roots) {
    const memberRecordIds = Array.from(idSet);
    const members = memberRecordIds.map((id) => byId.get(id)).filter((x): x is SalesOrderLive => x != null);
    const rootOrder = byId.get(groupRootId);
    const summedGrandTotal = members.reduce((s, o) => s + (o.grand_total ?? 0), 0);
    const representativeDueDateStr = groupRepresentativeDueDateStr(rootOrder, members);
    const representativePm = groupRepresentativePm(rootOrder, members);
    const repOrder = rootOrder ?? members[0];
    const plannedDaysForMetrics = repOrder ? plannedCycleDaysLive(repOrder) : null;
    const closeMonthKeyForMetrics = representativeDueDateStr
      ? parseDateToMonthKey(representativeDueDateStr.trim())
      : null;

    units.push({
      groupRootId,
      memberRecordIds,
      members,
      rootOrder,
      summedGrandTotal,
      representativeDueDateStr,
      representativePm,
      plannedDaysForMetrics,
      closeMonthKeyForMetrics,
    });
  }
  return units;
}

export function buildPipelineGroupUnits(
  orders: ReadonlyArray<SalesOrderPipeline>,
  parentByChild: SoChildToParentMap
): PipelineGroupUnit[] {
  const byId = indexById(orders);
  const roots = new Map<string, Set<string>>();
  for (const o of orders) {
    const r = getRootRecordId(o.record_id, parentByChild);
    if (!roots.has(r)) roots.set(r, new Set());
    roots.get(r)!.add(o.record_id);
  }

  const units: PipelineGroupUnit[] = [];
  for (const [groupRootId, idSet] of roots) {
    const memberRecordIds = Array.from(idSet);
    const members = memberRecordIds.map((id) => byId.get(id)).filter((x): x is SalesOrderPipeline => x != null);
    const rootOrder = byId.get(groupRootId);
    const summedGrandTotal = members.reduce((s, o) => s + (o.grand_total ?? 0), 0);
    const representativePm = groupRepresentativePm(rootOrder, members);
    const hasSetup = members.some((m) => isPipelineSetupOrder(m));
    units.push({
      groupRootId,
      memberRecordIds,
      members,
      rootOrder,
      summedGrandTotal,
      representativePm,
      hasSetup,
    });
  }
  return units;
}

/** PM analitiği: Due Date yılı temsilci due_date üzerinden. */
export function filterLiveGroupUnitsByDueDateYear(
  units: ReadonlyArray<LiveGroupUnit>,
  summaryYear: number | null
): LiveGroupUnit[] {
  if (summaryYear === null) return [...units];
  return units.filter((u) => {
    const y = parseDateToYear(u.representativeDueDateStr.trim());
    return y === summaryYear;
  });
}

/** Tabloda kök + alt SO sırası; filtrede en az bir üye görünen grupların tam ağacı. */
export function buildOrderedHierarchyRows<T extends { record_id: string; subject: string }>(
  allOrders: ReadonlyArray<T>,
  parentByChild: SoChildToParentMap,
  filteredOrders: ReadonlyArray<T>
): { row: T; depth: number }[] {
  const byId = new Map(allOrders.map((o) => [o.record_id, o]));
  const rootsNeeded = new Set<string>();
  for (const o of filteredOrders) {
    rootsNeeded.add(getRootRecordId(o.record_id, parentByChild));
  }
  const sortedRoots = Array.from(rootsNeeded).sort((a, b) => {
    const sa = byId.get(a)?.subject ?? '';
    const sb = byId.get(b)?.subject ?? '';
    return sa.localeCompare(sb, undefined, { sensitivity: 'base' });
  });
  const out: { row: T; depth: number }[] = [];
  for (const rootId of sortedRoots) {
    const members = allOrders.filter((o) => getRootRecordId(o.record_id, parentByChild) === rootId);
    const root = byId.get(rootId);
    const children = members
      .filter((m) => m.record_id !== rootId)
      .sort((a, b) => (a.subject || '').localeCompare(b.subject || '', undefined, { sensitivity: 'base' }));
    const ordered = root ? [root, ...children] : children;
    for (const row of ordered) {
      out.push({ row, depth: row.record_id === rootId ? 0 : 1 });
    }
  }
  return out;
}
