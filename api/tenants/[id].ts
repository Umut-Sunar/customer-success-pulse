import { sql } from '../../lib/db';
import { Tenant } from '../../types/tenant';

export default async function handler(req: Request) {
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

      const result = await sql`
        UPDATE tenants
        SET 
          tenant_name = COALESCE(${tenant_name}, tenant_name),
          account = COALESCE(${account}, account),
          tenant_owner = COALESCE(${tenant_owner}, tenant_owner),
          is_active = COALESCE(${is_active}, is_active),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING 
          id,
          tenant_name,
          account,
          tenant_owner,
          is_active,
          created_at::text,
          updated_at::text
      `;

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Tenant not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

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
      const result = await sql`
        DELETE FROM tenants
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Tenant not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

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

