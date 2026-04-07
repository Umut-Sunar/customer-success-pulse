import { sql, ensureDatabaseInitialized, runInTransaction } from '../../lib/db';
import { loadCustomerAccountMap, matchCustomerId } from '../../lib/customer-account-map';

export default async function handler(req: Request) {
  await ensureDatabaseInitialized();
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { tenantIds } = body;

    if (!Array.isArray(tenantIds) || tenantIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Tenant IDs array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch selected tenants
    const tenantsResult = sql`
      SELECT id, tenant_name, account, tenant_owner
      FROM tenants
      WHERE id IN (${sql.raw(tenantIds.map((id: number) => id.toString()).join(','))})
    `;

    if (tenantsResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No tenants found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customerByAccount = loadCustomerAccountMap();

    // Get existing mappings
    const existingMappings = new Set<string>();
    const allMappings = sql`SELECT customer_id, tenant_id FROM customer_tenant_mapping`;
    for (const m of allMappings.rows) {
      existingMappings.add(`${m.customer_id}|${m.tenant_id}`);
    }

    let added = 0;
    let skipped = 0;
    const mappingsToCreate: Array<{ customer_id: string; tenant_id: number }> = [];

    // Process each tenant
    for (const tenant of tenantsResult.rows) {
      const account = String(tenant.account ?? '');
      const customerId = matchCustomerId(customerByAccount, account);

      if (customerId) {
        const tid = Number(tenant.id);
        const mappingKey = `${customerId}|${tid}`;
        if (!existingMappings.has(mappingKey)) {
          mappingsToCreate.push({ customer_id: customerId, tenant_id: tid });
          added++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    // Bulk insert mappings
    if (mappingsToCreate.length > 0) {
      runInTransaction(() => {
        for (const mapping of mappingsToCreate) {
          try {
            sql`
              INSERT OR IGNORE INTO customer_tenant_mapping (customer_id, tenant_id)
              VALUES (${mapping.customer_id}, ${mapping.tenant_id})
            `;
          } catch (error: any) {
            console.error(`[Add to Customers] Error creating mapping:`, error);
          }
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      added,
      skipped,
      total: tenantIds.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error adding tenants to customers:', error);
    return new Response(JSON.stringify({ error: 'Failed to add tenants to customers', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

