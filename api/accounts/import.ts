import { v4 as uuidv4 } from 'uuid';
import { sql, ensureDatabaseInitialized } from '../../lib/db';
import type { AccountClientStatus } from '../../src/types/account.types';

const VALID_STATUS: AccountClientStatus[] = ['Setup', 'Live', 'Churned'];

function normalizeClientStatus(s: string): AccountClientStatus {
  const v = (s || 'Setup').trim();
  if (VALID_STATUS.includes(v as AccountClientStatus)) return v as AccountClientStatus;
  const lower = v.toLowerCase();
  if (lower === 'live' || lower === 'active') return 'Live';
  if (lower === 'churned') return 'Churned';
  return 'Setup';
}

export default async function handler(req: Request) {
  await ensureDatabaseInitialized();

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return new Response(JSON.stringify({ error: 'Array expected' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const accountMap = new Map<string, {
      country: string | null;
      service_country: string | null;
      clients: Array<{
        client_name: string;
        tenant_name: string | null;
        mrr: number;
        project_manager: string | null;
        status: AccountClientStatus;
      }>;
    }>();

    const errors: string[] = [];

    for (let i = 0; i < body.length; i++) {
      const row = body[i] as Record<string, unknown>;
      const accountName = row?.account_name != null ? String(row.account_name).trim() : '';
      if (!accountName) {
        errors.push(`Row ${i + 1}: missing account_name`);
        continue;
      }
      const clientName = row?.client_name != null ? String(row.client_name).trim() : accountName;
      const tenantName = row?.tenant_name != null ? String(row.tenant_name).trim() || null : null;
      const mrr = parseFloat(row?.mrr != null ? String(row.mrr) : (row?.last_month_mrr != null ? String(row.last_month_mrr) : '0')) || 0;
      const pm = row?.project_manager != null ? String(row.project_manager).trim() || null : null;
      const status = normalizeClientStatus(row?.status != null ? String(row.status) : '');
      const country = row?.country != null ? String(row.country).trim() || null : null;
      const serviceCountry = row?.service_country != null ? String(row.service_country).trim() || null : null;

      if (!accountMap.has(accountName)) {
        accountMap.set(accountName, { country, service_country: serviceCountry, clients: [] });
      }
      const entry = accountMap.get(accountName)!;
      if (country && !entry.country) entry.country = country;
      if (serviceCountry && !entry.service_country) entry.service_country = serviceCountry;

      entry.clients.push({ client_name: clientName, tenant_name: tenantName, mrr, project_manager: pm, status });
    }

    let accountsAdded = 0;
    let accountsUpdated = 0;
    let clientsAdded = 0;

    for (const [accountName, data] of accountMap) {
      try {
        const existingResult = sql`SELECT id FROM accounts WHERE account_name = ${accountName}`;
        const existingRows = existingResult.rows ?? [];
        let accountId: string;

        if (existingRows.length > 0) {
          accountId = String((existingRows[0] as Record<string, unknown>).id);
          sql`DELETE FROM account_clients WHERE account_id = ${accountId}`;
          sql`
            UPDATE accounts SET
              country = COALESCE(${data.country}, country),
              service_country = COALESCE(${data.service_country}, service_country),
              updated_at = datetime('now')
            WHERE id = ${accountId}
          `;
          accountsUpdated++;
        } else {
          accountId = uuidv4();
          sql`
            INSERT INTO accounts (id, account_name, country, service_country)
            VALUES (${accountId}, ${accountName}, ${data.country}, ${data.service_country})
          `;
          accountsAdded++;
        }

        for (const client of data.clients) {
          const clientId = uuidv4();
          sql`
            INSERT INTO account_clients (id, account_id, client_name, tenant_name, mrr, project_manager, status)
            VALUES (${clientId}, ${accountId}, ${client.client_name}, ${client.tenant_name}, ${client.mrr}, ${client.project_manager}, ${client.status})
          `;
          clientsAdded++;
        }
      } catch (e) {
        errors.push(`Account "${accountName}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return new Response(
      JSON.stringify({
        accounts_added: accountsAdded,
        accounts_updated: accountsUpdated,
        clients_added: clientsAdded,
        errors,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Import failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
