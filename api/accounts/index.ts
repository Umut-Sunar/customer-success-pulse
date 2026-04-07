import { v4 as uuidv4 } from 'uuid';
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

function dominantStatus(clients: AccountClient[]): AccountClientStatus {
  if (clients.some((c) => c.status === 'Churned')) return 'Churned';
  if (clients.some((c) => c.status === 'Setup')) return 'Setup';
  return 'Live';
}

function primaryPM(clients: AccountClient[]): string | null {
  const counts: Record<string, number> = {};
  for (const c of clients) {
    if (c.project_manager) {
      counts[c.project_manager] = (counts[c.project_manager] || 0) + 1;
    }
  }
  let best: string | null = null;
  let max = 0;
  for (const [pm, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      best = pm;
    }
  }
  return best;
}

function assembleAccountsWithClients(
  accounts: Account[],
  clients: AccountClient[]
): AccountWithClients[] {
  const clientsByAccount = new Map<string, AccountClient[]>();
  for (const c of clients) {
    const list = clientsByAccount.get(c.account_id) ?? [];
    list.push(c);
    clientsByAccount.set(c.account_id, list);
  }
  return accounts.map((a) => {
    const acClients = clientsByAccount.get(a.id) ?? [];
    return {
      ...a,
      clients: acClients,
      total_mrr: acClients.reduce((sum, c) => sum + c.mrr, 0),
      client_count: acClients.length,
      primary_pm: primaryPM(acClients),
      dominant_status: dominantStatus(acClients),
    };
  });
}

export default async function handler(req: Request) {
  await ensureDatabaseInitialized();

  if (req.method === 'GET') {
    try {
      const accountsResult = sql`SELECT * FROM accounts ORDER BY account_name`;
      const clientsResult = sql`SELECT * FROM account_clients ORDER BY client_name`;

      const accounts = (accountsResult.rows ?? []).map(rowToAccount);
      const clients = (clientsResult.rows ?? []).map(rowToClient);
      const assembled = assembleAccountsWithClients(accounts, clients);

      return new Response(JSON.stringify(assembled), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching accounts:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch accounts' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const accountName = String(body.account_name ?? '').trim();
      if (!accountName) {
        return new Response(JSON.stringify({ error: 'account_name is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const id = uuidv4();
      const country = body.country ?? null;
      const serviceCountry = body.service_country ?? null;

      sql`
        INSERT INTO accounts (id, account_name, country, service_country)
        VALUES (${id}, ${accountName}, ${country}, ${serviceCountry})
      `;

      const selectResult = sql`SELECT * FROM accounts WHERE id = ${id}`;
      const row = (selectResult.rows ?? [])[0];
      if (!row) {
        return new Response(JSON.stringify({ error: 'Insert failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(rowToAccount(row as Record<string, unknown>)), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error creating account:', error);
      return new Response(JSON.stringify({ error: 'Failed to create account' }), {
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
