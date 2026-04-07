import { v4 as uuidv4 } from 'uuid';
import { sql, ensureDatabaseInitialized } from '../../lib/db';
import type { Customer } from '../../src/types/customer.types';
import type { CreateCustomerInput } from '../../src/types/customer.types';

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
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.POSTGRES_URL;

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      let result: { rows: Record<string, unknown>[] };
      if (status && status !== 'All') {
        result = sql`
          SELECT * FROM customers WHERE status = ${status} ORDER BY name
        `;
      } else {
        result = sql`
          SELECT * FROM customers ORDER BY name
        `;
      }
      const customers = (result.rows ?? []).map(rowToCustomer);
      return new Response(JSON.stringify(customers), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch customers' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body: CreateCustomerInput = await req.json();
      if (!body.name) {
        return new Response(JSON.stringify({ error: 'name is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const id = body.id ?? uuidv4();
      const name = body.name;
      const domain = body.domain ?? '';
      const segment = body.segment ?? 'Mid-Market';
      const mrr = body.mrr ?? 0;
      const status = body.status ?? 'Active';
      const contract_start = body.contract_start ?? null;
      const contract_end = body.contract_end ?? null;
      const account_manager = body.account_manager ?? null;

      if (isDevelopment) {
        sql`
          INSERT OR IGNORE INTO customers (id, name, domain, segment, mrr, status, contract_start, contract_end, account_manager)
          VALUES (${id}, ${name}, ${domain}, ${segment}, ${mrr}, ${status}, ${contract_start}, ${contract_end}, ${account_manager})
        `;
        const selectResult = sql`
          SELECT * FROM customers WHERE id = ${id}
        `;
        const row = selectResult.rows?.[0];
        if (!row) {
          return new Response(JSON.stringify({ error: 'Conflict or insert failed' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify(rowToCustomer(row)), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = sql`
        INSERT INTO customers (id, name, domain, segment, mrr, status, contract_start, contract_end, account_manager)
        VALUES (${id}, ${name}, ${domain}, ${segment}, ${mrr}, ${status}, ${contract_start}, ${contract_end}, ${account_manager})
        ON CONFLICT (id) DO NOTHING
        RETURNING *
      `;
      const rows = result.rows ?? [];
      if (rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Conflict or insert failed' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(rowToCustomer(rows[0] as Record<string, unknown>)), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      return new Response(JSON.stringify({ error: 'Failed to create customer' }), {
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
