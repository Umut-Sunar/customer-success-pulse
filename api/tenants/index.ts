import { sql, ensureDatabaseInitialized } from '../../lib/db';
import { Tenant } from '../../types/tenant';

export default async function handler(req: Request) {
  await ensureDatabaseInitialized();
  if (req.method === 'GET') {
    try {
      // Handle both SQLite and Postgres
      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.POSTGRES_URL;
      const result = sql`
        SELECT 
          id,
          tenant_name,
          account,
          tenant_owner,
          is_active,
          ${isDevelopment ? sql.raw('created_at') : sql.raw('created_at::text')},
          ${isDevelopment ? sql.raw('updated_at') : sql.raw('updated_at::text')}
        FROM tenants
        ORDER BY created_at DESC
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

      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.POSTGRES_URL;
      const result = sql`
        INSERT INTO tenants (tenant_name, account, tenant_owner, is_active)
        VALUES (${tenant_name}, ${account}, ${tenant_owner || null}, ${isDevelopment ? (is_active ? 1 : 0) : is_active})
        ${isDevelopment ? sql.raw('') : sql.raw('RETURNING id, tenant_name, account, tenant_owner, is_active, created_at::text, updated_at::text')}
      `;
      
      // For SQLite, get the inserted row
      let tenantRow: any;
      if (isDevelopment) {
        const tenantId = result.rows[0]?.id || (result as any).lastInsertRowid;
        const selectResult = sql`
          SELECT id, tenant_name, account, tenant_owner, is_active, created_at, updated_at
          FROM tenants
          WHERE id = ${tenantId}
        `;
        tenantRow = selectResult.rows[0];
      } else {
        tenantRow = result.rows[0];
      }

      const tenant: Tenant = {
        id: tenantRow.id,
        tenant_name: tenantRow.tenant_name,
        account: tenantRow.account,
        tenant_owner: tenantRow.tenant_owner,
        is_active: tenantRow.is_active === 1 || tenantRow.is_active === true,
        created_at: typeof tenantRow.created_at === 'string' ? tenantRow.created_at : new Date(tenantRow.created_at).toISOString(),
        updated_at: typeof tenantRow.updated_at === 'string' ? tenantRow.updated_at : new Date(tenantRow.updated_at).toISOString(),
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

