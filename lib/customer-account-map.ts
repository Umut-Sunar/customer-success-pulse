import { sql } from './db';

/** Map lowercase account name OR domain → customer id (for tenant CSV "Account" column matching). */
export function buildCustomerAccountMap(rows: Record<string, unknown>[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const id = String(row.id);
    const name = String(row.name ?? '').toLowerCase().trim();
    const domain = String(row.domain ?? '').toLowerCase().trim();
    if (name) map.set(name, id);
    if (domain) map.set(domain, id);
  }
  return map;
}

export function loadCustomerAccountMap(): Map<string, string> {
  const result = sql`SELECT id, name, domain FROM customers`;
  return buildCustomerAccountMap((result.rows ?? []) as Record<string, unknown>[]);
}

export function matchCustomerId(map: Map<string, string>, account: string): string | undefined {
  return map.get(account.toLowerCase().trim());
}
