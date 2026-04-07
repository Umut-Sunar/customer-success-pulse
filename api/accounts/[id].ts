import { sql, ensureDatabaseInitialized } from '../../lib/db';
import type { Account, AccountClient, AccountWithClients, AccountClientStatus } from '../../src/types/account.types';

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: String(row.id),
    account_name: String(row.account_name ?? ''),
    country: row.country != null ? String(row.country) : null,
    service_country: row.service_country != null ? String(row.service_country) : null,
    created_at: row.created_at != null ? String(row.created_at) : '',
    updated_at: row.updated_at != null ? String(row.updated_at) : '',
  };
}

function rowToClient(row: Record<string, unknown>): AccountClient {
  return {
    id: String(row.id),
    account_id: String(row.account_id),
    client_name: String(row.client_name ?? ''),
    tenant_name: row.tenant_name != null ? String(row.tenant_name) : null,
    mrr: Number(row.mrr ?? 0),
    project_manager: row.project_manager != null ? String(row.project_manager) : null,
    status: (String(row.status ?? 'Setup')) as AccountClientStatus,
    created_at: row.created_at != null ? String(row.created_at) : '',
    updated_at: row.updated_at != null ? String(row.updated_at) : '',
  };
}

export default async function handler(req: Request) {
  await ensureDatabaseInitialized();
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid account ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'GET') {
    try {
      const accountResult = sql`SELECT * FROM accounts WHERE id = ${id}`;
      const rows = accountResult.rows ?? [];
      if (rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const account = rowToAccount(rows[0] as Record<string, unknown>);
      const clientsResult = sql`SELECT * FROM account_clients WHERE account_id = ${id} ORDER BY client_name`;
      const clients = (clientsResult.rows ?? []).map((r) => rowToClient(r as Record<string, unknown>));

      const totalMrr = clients.reduce((sum, c) => sum + c.mrr, 0);
      const dominantStatus: AccountClientStatus = clients.some((c) => c.status === 'Churned')
        ? 'Churned'
        : clients.some((c) => c.status === 'Setup')
          ? 'Setup'
          : 'Live';

      const pmCounts: Record<string, number> = {};
      for (const c of clients) {
        if (c.project_manager) pmCounts[c.project_manager] = (pmCounts[c.project_manager] || 0) + 1;
      }
      let primaryPm: string | null = null;
      let maxCount = 0;
      for (const [pm, count] of Object.entries(pmCounts)) {
        if (count > maxCount) { maxCount = count; primaryPm = pm; }
      }

      const result: AccountWithClients = {
        ...account,
        clients,
        total_mrr: totalMrr,
        client_count: clients.length,
        primary_pm: primaryPm,
        dominant_status: dominantStatus,
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching account:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch account' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = await req.json();
      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.POSTGRES_URL;

      if (isDevelopment) {
        sql`
          UPDATE accounts SET
            account_name = COALESCE(${body.account_name ?? null}, account_name),
            country = COALESCE(${body.country ?? null}, country),
            service_country = COALESCE(${body.service_country ?? null}, service_country),
            updated_at = datetime('now')
          WHERE id = ${id}
        `;
      } else {
        sql`
          UPDATE accounts SET
            account_name = COALESCE(${body.account_name ?? null}, account_name),
            country = COALESCE(${body.country ?? null}, country),
            service_country = COALESCE(${body.service_country ?? null}, service_country),
            updated_at = NOW()
          WHERE id = ${id}
        `;
      }

      const selectResult = sql`SELECT * FROM accounts WHERE id = ${id}`;
      const rows = selectResult.rows ?? [];
      if (rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(rowToAccount(rows[0] as Record<string, unknown>)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error updating account:', error);
      return new Response(JSON.stringify({ error: 'Failed to update account' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const checkResult = sql`SELECT id FROM accounts WHERE id = ${id}`;
      if ((checkResult.rows ?? []).length === 0) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      sql`DELETE FROM accounts WHERE id = ${id}`;
      return new Response(JSON.stringify({ message: 'Deleted' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}
