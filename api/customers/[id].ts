import { sql, ensureDatabaseInitialized } from '../../lib/db';
import type { Customer, CustomerWithOnboarding } from '../../src/types/customer.types';

function rowToCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    name: String(row.name),
    domain: String(row.domain ?? ''),
    segment: (row.segment as Customer['segment']) ?? 'Mid-Market',
    mrr: Number(row.mrr ?? 0),
    status: (row.status as Customer['status']) ?? 'Active',
    contract_start: row.contract_start != null ? String(row.contract_start) : null,
    contract_end: row.contract_end != null ? String(row.contract_end) : null,
    account_manager: row.account_manager != null ? String(row.account_manager) : null,
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
    return new Response(JSON.stringify({ error: 'Invalid customer ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'GET') {
    try {
      const result = sql`
        SELECT c.*, o.id as onboarding_id, o.stage, o.go_live_date, o.committed_live_date,
               o.bottleneck, o.progress, o.notes as onboarding_notes
        FROM customers c
        LEFT JOIN onboarding_details o ON o.customer_id = c.id
        WHERE c.id = ${id}
      `;
      const rows = result.rows ?? [];
      if (rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const row = rows[0] as Record<string, unknown>;
      const customer: CustomerWithOnboarding = {
        ...rowToCustomer(row),
        onboarding: row.onboarding_id != null
          ? {
              id: Number(row.onboarding_id),
              customer_id: id,
              stage: String(row.stage ?? 'Requirements'),
              go_live_date: row.go_live_date != null ? String(row.go_live_date) : null,
              committed_live_date: row.committed_live_date != null ? String(row.committed_live_date) : null,
              bottleneck: row.bottleneck != null ? String(row.bottleneck) : null,
              progress: Number(row.progress ?? 0),
              notes: row.onboarding_notes != null ? String(row.onboarding_notes) : null,
            }
          : undefined,
      };
      return new Response(JSON.stringify(customer), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch customer' }), {
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
          UPDATE customers SET
            name = COALESCE(${body.name ?? null}, name),
            domain = COALESCE(${body.domain ?? null}, domain),
            segment = COALESCE(${body.segment ?? null}, segment),
            mrr = COALESCE(${body.mrr ?? null}, mrr),
            status = COALESCE(${body.status ?? null}, status),
            contract_start = COALESCE(${body.contract_start ?? null}, contract_start),
            contract_end = COALESCE(${body.contract_end ?? null}, contract_end),
            account_manager = COALESCE(${body.account_manager ?? null}, account_manager),
            updated_at = datetime('now')
          WHERE id = ${id}
        `;
      } else {
        sql`
          UPDATE customers SET
            name = COALESCE(${body.name ?? null}, name),
            domain = COALESCE(${body.domain ?? null}, domain),
            segment = COALESCE(${body.segment ?? null}, segment),
            mrr = COALESCE(${body.mrr ?? null}, mrr),
            status = COALESCE(${body.status ?? null}, status),
            contract_start = COALESCE(${body.contract_start ?? null}, contract_start),
            contract_end = COALESCE(${body.contract_end ?? null}, contract_end),
            account_manager = COALESCE(${body.account_manager ?? null}, account_manager),
            updated_at = NOW()
          WHERE id = ${id}
        `;
      }
      const selectResult = sql`SELECT * FROM customers WHERE id = ${id}`;
      const rows = selectResult.rows ?? [];
      if (rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(rowToCustomer(rows[0] as Record<string, unknown>)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      return new Response(JSON.stringify({ error: 'Failed to update customer' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const checkResult = sql`SELECT id FROM customers WHERE id = ${id}`;
      if ((checkResult.rows ?? []).length === 0) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      sql`DELETE FROM customers WHERE id = ${id}`;
      return new Response(JSON.stringify({ message: 'Deleted' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error deleting customer:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete customer' }), {
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
