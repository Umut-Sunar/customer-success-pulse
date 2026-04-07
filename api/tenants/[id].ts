import { sql, ensureDatabaseInitialized } from '../../lib/db';
import { Tenant } from '../../types/tenant';

export default async function handler(req: Request) {
  await ensureDatabaseInitialized();
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const id = parseInt(pathParts[pathParts.length - 1]);

  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid tenant ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'PUT') {
    try {
      const body = await req.json();
      const { tenant_name, account, tenant_owner, is_active } = body;

      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.POSTGRES_URL;
      const result = sql`
        UPDATE tenants
        SET 
          tenant_name = ${tenant_name !== undefined ? tenant_name : sql.raw('tenant_name')},
          account = ${account !== undefined ? account : sql.raw('account')},
          tenant_owner = ${tenant_owner !== undefined ? tenant_owner : sql.raw('tenant_owner')},
          is_active = ${is_active !== undefined ? (isDevelopment ? (is_active ? 1 : 0) : is_active) : sql.raw('is_active')},
          updated_at = ${isDevelopment ? sql.raw("datetime('now')") : sql.raw('NOW()')}
        WHERE id = ${id}
        ${isDevelopment ? sql.raw('') : sql.raw('RETURNING id, tenant_name, account, tenant_owner, is_active, created_at::text, updated_at::text')}
      `;
      
      // For SQLite, get the updated row
      let tenantRow: any;
      if (isDevelopment) {
        const selectResult = sql`
          SELECT id, tenant_name, account, tenant_owner, is_active, created_at, updated_at
          FROM tenants
          WHERE id = ${id}
        `;
        tenantRow = selectResult.rows[0];
      } else {
        tenantRow = result.rows[0];
      }

      if (!tenantRow) {
        return new Response(JSON.stringify({ error: 'Tenant not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
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
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error updating tenant:', error);
      return new Response(JSON.stringify({ error: 'Failed to update tenant' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.POSTGRES_URL;
      
      // Check if tenant exists before deleting
      const checkResult = sql`
        SELECT id FROM tenants WHERE id = ${id}
      `;
      
      if (checkResult.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Tenant not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Delete tenant
      sql`
        DELETE FROM tenants
        WHERE id = ${id}
      `;

      return new Response(JSON.stringify({ message: 'Tenant deleted successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error deleting tenant:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete tenant' }), {
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

