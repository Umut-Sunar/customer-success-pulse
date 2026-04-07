/**
 * Canonical PM identity for joining Account CRM data ↔ Meeting Intel (pm_scores) ↔ PM Performance.
 * Strategy matches PM Performance: prefer email when present, else normalized name.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/** Optional manual overrides: normalized lookup key → canonical key (e.g. email). */
export const PM_ALIAS_OVERRIDES: Record<string, string> = {};

function applyAlias(normalizedKey: string): string {
  return PM_ALIAS_OVERRIDES[normalizedKey] ?? normalizedKey;
}

/** Trim, lowercase, collapse whitespace, strip common punctuation around tokens. */
export function normalizePmKey(input: string): string {
  const s = String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.,;]+/g, ' ')
    .replace(/\s+/g, ' ');
  return applyAlias(s);
}

/** True if string looks like an email (simple check). */
export function looksLikeEmail(s: string): boolean {
  const t = String(s ?? '').trim();
  return t.length > 3 && EMAIL_RE.test(t);
}

/**
 * Same canonical key as PM Performance / SalesOrders PM filters:
 * normalized email if valid, else normalized display name.
 */
export function canonicalPmKeyFromParts(pmEmail: string, pmName: string): string {
  const e = String(pmEmail ?? '').trim();
  if (looksLikeEmail(e)) {
    return applyAlias(e.toLowerCase());
  }
  return applyAlias(normalizePmKey(pmName));
}

export function canonicalPmKeyFromScore(row: { pm_email?: string; pm_name?: string }): string {
  return canonicalPmKeyFromParts(row.pm_email ?? '', row.pm_name ?? '');
}

/** Collect distinct CRM-side PM keys from an account (primary + per-client). */
export function collectCrmPmKeys(account: {
  primary_pm: string | null;
  clients: Array<{ project_manager: string | null }>;
}): Set<string> {
  const set = new Set<string>();
  if (account.primary_pm) {
    const k = canonicalPmKeyFromParts('', account.primary_pm);
    if (k) set.add(k);
  }
  for (const c of account.clients) {
    if (c.project_manager) {
      const k = canonicalPmKeyFromParts('', c.project_manager);
      if (k) set.add(k);
    }
  }
  return set;
}

/**
 * Whether a pm_scores row refers to the same person as any CRM key.
 * - If both sides have the same email key → match.
 * - Else fuzzy name: exact normalized equality, substring (length ≥ 4), or token overlap.
 */
export function pmScoreMatchesCrmSet(
  score: { pm_email?: string; pm_name?: string },
  crmKeys: Set<string>
): boolean {
  if (crmKeys.size === 0) return false;

  const scoreKey = canonicalPmKeyFromScore(score);
  if (crmKeys.has(scoreKey)) return true;

  const scoreEmail = String(score.pm_email ?? '').trim().toLowerCase();
  if (looksLikeEmail(scoreEmail) && crmKeys.has(scoreEmail)) return true;

  const nameA = normalizePmKey(score.pm_name ?? '');
  for (const crm of crmKeys) {
    if (!crm || !nameA) continue;
    if (looksLikeEmail(crm)) {
      if (scoreEmail && scoreEmail === crm) return true;
      continue;
    }
    if (namesLikelySamePerson(nameA, crm)) return true;
  }
  return false;
}

function namesLikelySamePerson(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 2 || b.length < 2) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length >= 4 && (long.includes(short) || short.includes(long))) return true;

  const ta = a.split(/\s+/).filter((w) => w.length > 1);
  const tb = b.split(/\s+/).filter((w) => w.length > 1);
  if (ta.length === 0 || tb.length === 0) return false;
  const [smaller, larger] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const lset = new Set(larger);
  const allIn = smaller.every((w) => lset.has(w));
  return allIn && smaller.length >= 2;
}

export interface PmCrmAlignment {
  /** pm_scores rows for this account's meetings (customer meetings only). */
  pmScoreRowsForAccount: number;
  /** How many of those rows match at least one CRM project_manager name. */
  matchedRows: number;
  /** 0–100, or null if no CRM PM or no scored meetings. */
  alignmentPercent: number | null;
  /** Distinct canonical PM keys seen in meetings for this account. */
  meetingPmKeys: string[];
}

export function computePmCrmAlignment(
  account: {
    primary_pm: string | null;
    clients: Array<{ project_manager: string | null }>;
  },
  customerMeetingIds: Set<string>,
  pmScores: Array<{ meeting_id: string; pm_email?: string; pm_name?: string }>
): PmCrmAlignment {
  const crmKeys = collectCrmPmKeys(account);
  const relevant = pmScores.filter((p) => customerMeetingIds.has(p.meeting_id));

  const meetingKeySet = new Set<string>();
  for (const p of relevant) {
    meetingKeySet.add(canonicalPmKeyFromScore(p));
  }

  let matched = 0;
  for (const p of relevant) {
    if (pmScoreMatchesCrmSet(p, crmKeys)) matched++;
  }

  const n = relevant.length;
  const alignmentPercent =
    crmKeys.size === 0 || n === 0
      ? null
      : Math.round((matched / n) * 100);

  return {
    pmScoreRowsForAccount: n,
    matchedRows: matched,
    alignmentPercent,
    meetingPmKeys: [...meetingKeySet].sort(),
  };
}

/** CRM `project_manager` / `primary_pm` → account ids (for future PM dashboards). */
export function groupAccountIdsByCrmPm(
  accounts: Array<{
    id: string;
    primary_pm: string | null;
    clients: Array<{ project_manager: string | null }>;
  }>
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const a of accounts) {
    const keys = collectCrmPmKeys(a);
    for (const k of keys) {
      if (!k) continue;
      const list = map.get(k) ?? [];
      list.push(a.id);
      map.set(k, list);
    }
  }
  return map;
}
