import { sql, ensureDatabaseInitialized } from '../../../lib/db';
import { Tenant } from '../../../types/tenant';

export default async function handler(req: Request) {
  await ensureDatabaseInitialized();
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const customerId = pathParts[pathParts.length - 2]; // Get customer ID from path
    
    const customerName = url.searchParams.get('name');
    const customerDomain = url.searchParams.get('domain');

    if (!customerName && !customerDomain) {
      return new Response(JSON.stringify({ error: 'Customer name or domain required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Match tenants where account equals customer name or domain
    const result = await sql`
      SELECT 
        id,
        tenant_name,
        account,
        tenant_owner,
        is_active,
        created_at::text,
        updated_at::text
      FROM tenants
      WHERE is_active = true
      AND (
        account = ${customerName || ''}
        OR account = ${customerDomain || ''}
        OR LOWER(account) = LOWER(${customerName || ''})
        OR LOWER(account) = LOWER(${customerDomain || ''})
      )
      ORDER BY tenant_name ASC
    `;

    const tenants: Tenant[] = result.rows.map((row) => ({
      id: row.id,
      tenant_name: row.tenant_name,
      account: row.account,
      tenant_owner: row.tenant_owner,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return new Response(JSON.stringify(tenants), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching customer tenants:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch customer tenants' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

