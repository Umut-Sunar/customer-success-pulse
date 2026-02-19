import { sql, ensureDatabaseInitialized } from '../../lib/db';
import { Tenant } from '../../types/tenant';

export default async function handler(req: Request) {
  await ensureDatabaseInitialized();
  if (req.method === 'GET') {
    try {
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
        ORDER BY created_at DESC
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
      console.error('Error fetching tenants:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch tenants' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { tenant_name, account, tenant_owner, is_active = true } = body;

      if (!tenant_name || !account) {
        return new Response(JSON.stringify({ error: 'Tenant name and account are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await sql`
        INSERT INTO tenants (tenant_name, account, tenant_owner, is_active)
        VALUES (${tenant_name}, ${account}, ${tenant_owner || null}, ${is_active})
        RETURNING 
          id,
          tenant_name,
          account,
          tenant_owner,
          is_active,
          created_at::text,
          updated_at::text
      `;

      const tenant: Tenant = {
        id: result.rows[0].id,
        tenant_name: result.rows[0].tenant_name,
        account: result.rows[0].account,
        tenant_owner: result.rows[0].tenant_owner,
        is_active: result.rows[0].is_active,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
      };

      return new Response(JSON.stringify(tenant), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'Tenant with this name and account already exists' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to create tenant' }), {
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

