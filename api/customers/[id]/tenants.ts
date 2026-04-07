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
    
    // Get tenants from customer_tenant_mapping table
    const result = sql`
      SELECT 
        t.id,
        t.tenant_name,
        t.account,
        t.tenant_owner,
        t.is_active,
        t.created_at,
        t.updated_at
      FROM customer_tenant_mapping ctm
      INNER JOIN tenants t ON ctm.tenant_id = t.id
      WHERE ctm.customer_id = ${customerId}
      AND t.is_active = 1
      ORDER BY t.tenant_name ASC
    `;

    const tenants: Tenant[] = result.rows.map((row) => ({
      id: row.id,
      tenant_name: row.tenant_name,
      account: row.account,
      tenant_owner: row.tenant_owner,
      is_active: row.is_active === 1 || row.is_active === true,
      created_at: typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at).toISOString(),
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date(row.updated_at).toISOString(),
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
