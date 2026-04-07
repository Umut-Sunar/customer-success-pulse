import type { SalesOrderLive, SalesOrderPipeline } from '../types/sales.types';
import type { LiveGroupUnit, PipelineGroupUnit } from './sales-order-groups';
import {
  getLiveOrderDateForBucket,
  parseDateToMonthKey,
  parseDateToYear,
  plannedCycleDaysLive,
} from './sales-utils';

export { plannedCycleDaysLive } from './sales-utils';

/** Close / bucket month for Live (Dashboard & Live month filter ile uyumlu). */
export function closeMonthKeyFromLive(o: SalesOrderLive): string | null {
  return parseDateToMonthKey(getLiveOrderDateForBucket(o));
}

/**
 * PM Sales analitiği: kapanış / ay grubu = CSV Due Date (`due_date`) — go-live bu blokta buna göre.
 */
export function closeMonthKeyFromDueDate(o: SalesOrderLive): string | null {
  return parseDateToMonthKey((o.due_date || '').trim());
}

/**
 * PM blok için özet yıl süzgeci: `due_date` takvim yılı (üst KPI’daki getLiveOrderYear’dan bağımsız).
 */
export function filterLiveByDueDateYear(
  live: ReadonlyArray<SalesOrderLive>,
  summaryYear: number | null
): SalesOrderLive[] {
  if (summaryYear === null) return [...live];
  return live.filter((o) => parseDateToYear((o.due_date || '').trim()) === summaryYear);
}

/** Pipeline satırı Setup mu — trim + case-insensitive. */
export function isPipelineSetup(o: SalesOrderPipeline): boolean {
  return (o.status || '').trim().toLowerCase() === 'setup';
}

export function normalizePmName(pm: string): string {
  const t = (pm || '').trim();
  return t.length > 0 ? t : 'Unassigned';
}

export interface PmSalesSummaryRow {
  pm: string;
  /** Tüm pipeline CSV — yalnızca Setup; özet yıldan bağımsız anlık snapshot. */
  setupPipelineCount: number;
  /** Geçerli Due Date ayı olan satırlar (tekil record_id); kapsam = due_date yılı (özet yıl). */
  closedLiveCount: number;
  /** Aynı Live kümesinde due_date ve order_date ikisi de geçerliyse ortalama gün. */
  avgPlannedDays: number | null;
}

export interface MonthCloseAvgRow {
  monthKey: string;
  avgPlannedDays: number | null;
  closedCount: number;
  /** Ortalamaya giren sipariş sayısı (her iki tarih de parse edildiyse). */
  avgSampleSize: number;
}

/** PM → anlık Setup iş sayısı (tüm pipeline; yıl filtresi yok). */
export function setupCountByProjectManager(
  pipelineOrders: ReadonlyArray<SalesOrderPipeline>
): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of pipelineOrders) {
    if (!isPipelineSetup(o)) continue;
    const pm = normalizePmName(o.project_manager);
    m.set(pm, (m.get(pm) ?? 0) + 1);
  }
  return m;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * PM başına: Setup (global pipeline), Closed Live (Due Date ayı geçerli) ve ortalama gün.
 * `liveForPmScope` = `filterLiveByDueDateYear(liveOrders, summaryYear)` ile beslenmeli.
 */
export function computePmSalesSummaryRows(
  liveForPmScope: ReadonlyArray<SalesOrderLive>,
  pipelineOrders: ReadonlyArray<SalesOrderPipeline>,
  pmFilter: string
): PmSalesSummaryRow[] {
  const setupByPm = setupCountByProjectManager(pipelineOrders);

  const allPms = new Set<string>();
  setupByPm.forEach((_n, pm) => allPms.add(pm));
  liveForPmScope.forEach((o) => allPms.add(normalizePmName(o.project_manager)));

  const listPms =
    pmFilter === 'All PMs'
      ? Array.from(allPms).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      : [normalizePmName(pmFilter)];

  return listPms.map((pm) => {
    const liveRows = liveForPmScope.filter((o) => normalizePmName(o.project_manager) === pm);
    const closedIds = new Set<string>();
    const planned: number[] = [];
    for (const o of liveRows) {
      if (closeMonthKeyFromDueDate(o)) closedIds.add(o.record_id);
      const d = plannedCycleDaysLive(o);
      if (d !== null) planned.push(d);
    }
    return {
      pm,
      setupPipelineCount: setupByPm.get(pm) ?? 0,
      closedLiveCount: closedIds.size,
      avgPlannedDays: average(planned),
    };
  });
}

/**
 * CSV Due Date ayına göre gruplama ve ortalama planned gün.
 * Boş veya parse edilemeyen due_date satırları dahil edilmez.
 */
export function computeMonthCloseAvgRows(
  liveForPmScope: ReadonlyArray<SalesOrderLive>,
  pmFilter: string
): MonthCloseAvgRow[] {
  const live =
    pmFilter === 'All PMs'
      ? [...liveForPmScope]
      : liveForPmScope.filter(
          (o) => normalizePmName(o.project_manager) === normalizePmName(pmFilter)
        );

  const byMonth = new Map<string, SalesOrderLive[]>();
  for (const o of live) {
    const mk = closeMonthKeyFromDueDate(o);
    if (!mk) continue;
    const arr = byMonth.get(mk);
    if (arr) arr.push(o);
    else byMonth.set(mk, [o]);
  }

  const rows: MonthCloseAvgRow[] = [];
  for (const [monthKey, orders] of byMonth) {
    const ids = new Set(orders.map((o) => o.record_id));
    const planned = orders
      .map((o) => plannedCycleDaysLive(o))
      .filter((d): d is number => d !== null);
    rows.push({
      monthKey,
      avgPlannedDays: average(planned),
      closedCount: ids.size,
      avgSampleSize: planned.length,
    });
  }
  return rows.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

/** PM tablosu — tekilleştirilmiş Live / Pipeline grup birimleri. */
export function computePmSalesSummaryRowsGrouped(
  liveUnits: ReadonlyArray<LiveGroupUnit>,
  pipelineUnits: ReadonlyArray<PipelineGroupUnit>,
  pmFilter: string
): PmSalesSummaryRow[] {
  const setupByPm = new Map<string, number>();
  for (const u of pipelineUnits) {
    if (!u.hasSetup) continue;
    const pm = normalizePmName(u.representativePm);
    setupByPm.set(pm, (setupByPm.get(pm) ?? 0) + 1);
  }

  const allPms = new Set<string>();
  setupByPm.forEach((_n, pm) => allPms.add(pm));
  liveUnits.forEach((u) => allPms.add(normalizePmName(u.representativePm)));

  const listPms =
    pmFilter === 'All PMs'
      ? Array.from(allPms).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      : [normalizePmName(pmFilter)];

  return listPms.map((pm) => {
    const units = liveUnits.filter((u) => normalizePmName(u.representativePm) === pm);
    let closed = 0;
    const planned: number[] = [];
    for (const u of units) {
      if (u.closeMonthKeyForMetrics) closed += 1;
      if (u.plannedDaysForMetrics !== null) planned.push(u.plannedDaysForMetrics);
    }
    return {
      pm,
      setupPipelineCount: setupByPm.get(pm) ?? 0,
      closedLiveCount: closed,
      avgPlannedDays: average(planned),
    };
  });
}

/** Ay grafiği — grup başına tek örnek (temsilci Due Date ayı). */
export function computeMonthCloseAvgRowsGrouped(
  liveUnits: ReadonlyArray<LiveGroupUnit>,
  pmFilter: string
): MonthCloseAvgRow[] {
  const units =
    pmFilter === 'All PMs'
      ? [...liveUnits]
      : liveUnits.filter((u) => normalizePmName(u.representativePm) === normalizePmName(pmFilter));

  const byMonth = new Map<string, LiveGroupUnit[]>();
  for (const u of units) {
    const mk = u.closeMonthKeyForMetrics;
    if (!mk) continue;
    const arr = byMonth.get(mk);
    if (arr) arr.push(u);
    else byMonth.set(mk, [u]);
  }

  const rows: MonthCloseAvgRow[] = [];
  for (const [monthKey, groupUnits] of byMonth) {
    const planned = groupUnits
      .map((u) => u.plannedDaysForMetrics)
      .filter((d): d is number => d !== null);
    rows.push({
      monthKey,
      avgPlannedDays: average(planned),
      closedCount: groupUnits.length,
      avgSampleSize: planned.length,
    });
  }
  return rows.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}
