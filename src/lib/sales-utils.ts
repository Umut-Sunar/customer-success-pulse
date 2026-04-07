import type { SalesOrderLive, SalesOrderPipeline } from '../types/sales.types';

/** CSV / ISO benzeri tarih stringleri; geçersiz/boş → null. */
export function parseDateSafe(iso: string): Date | null {
  const s = (iso || '').trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Takvim gün farkı (UTC tarih bileşenleri; DST kayması yok).
 */
export function diffCalendarDays(start: Date, end: Date): number {
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / 86400000);
}

/** Planned span (gün): Due Date − Order Date (ikisi parse edilebiliyorsa). */
export function plannedCycleDaysLive(o: SalesOrderLive): number | null {
  const s = parseDateSafe(o.order_date);
  const e = parseDateSafe(o.due_date);
  if (!s || !e) return null;
  return diffCalendarDays(s, e);
}

/** Tercih B: committed_live_date doluysa onu, değilse due_date (Zoho Due Date). */
export function getSalesLiveDisplayDate(o: SalesOrderLive): string {
  const c = (o.committed_live_date || '').trim();
  const d = (o.due_date || '').trim();
  return c || d;
}

/**
 * Aylık gruplama (Dashboard Historical + Sales ay filtresi ile uyumlu):
 * önce Live Date görünür tarihi, yoksa order_date, yoksa created_time.
 */
export function getLiveOrderDateForBucket(o: SalesOrderLive): string {
  const live = getSalesLiveDisplayDate(o).trim();
  if (live) return live;
  return (o.order_date || o.created_time || '').trim();
}

/** Parse çeşitli CSV tarih stringlerini; `YYYY-MM` anahtarı veya `null` (geçersiz). */
export function parseDateToMonthKey(dateStr: string): string | null {
  const s = (dateStr || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** Özet yıl filtresi için takvim yılı veya `null` (geçersiz/boş tarih). */
export function parseDateToYear(dateStr: string): number | null {
  const s = (dateStr || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

/** Live satırı hangi yıla yazılır: created_time → order_date → Live Date görünür tarihi. */
export function getLiveOrderYear(o: SalesOrderLive): number | null {
  const fromCreated = parseDateToYear(o.created_time);
  if (fromCreated != null) return fromCreated;
  const fromOrder = parseDateToYear(o.order_date);
  if (fromOrder != null) return fromOrder;
  const mk = parseDateToMonthKey(getSalesLiveDisplayDate(o));
  if (!mk) return null;
  const y = Number.parseInt(mk.slice(0, 4), 10);
  return Number.isNaN(y) ? null : y;
}

/** Pipeline satırı hangi yıla yazılır: created_time → due_date → contract_date. */
export function getPipelineOrderYear(o: SalesOrderPipeline): number | null {
  return (
    parseDateToYear(o.created_time) ?? parseDateToYear(o.due_date) ?? parseDateToYear(o.contract_date)
  );
}
