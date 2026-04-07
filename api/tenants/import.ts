import { sql, ensureDatabaseInitialized, runInTransaction } from '../../lib/db';
import { loadCustomerAccountMap, matchCustomerId } from '../../lib/customer-account-map';
import { parseCSV, validateTenantRow, cleanTenantData } from '../../lib/csv-parser';
import { TenantImportResult } from '../../types/tenant';

export default async function handler(req: Request) {
  await ensureDatabaseInitialized();
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rows = await parseCSV(file);
    
    const result: TenantImportResult = {
      totalRows: rows.length,
      newTenants: 0,
      skippedDuplicates: 0,
      errors: [],
    };

    const customerByAccount = loadCustomerAccountMap();

    // Step 2: Clean and validate all rows (pure CPU, no DB)
    const validRows: Array<{ index: number; account: string; tenantName: string; tenantOwner: string | null }> = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cleaned = cleanTenantData(row);
      
      const validation = validateTenantRow(cleaned);
      if (!validation.valid) {
        // Build detailed error message with available row data
        const rowNumber = i + 2;
        const availableData: string[] = [];
        
        if (cleaned['Tenant Name']) {
          availableData.push(`Tenant Name: "${cleaned['Tenant Name']}"`);
        }
        if (cleaned['Account']) {
          availableData.push(`Account: "${cleaned['Account']}"`);
        }
        if (cleaned['Tenant Owner']) {
          availableData.push(`Tenant Owner: "${cleaned['Tenant Owner']}"`);
        }
        
        const dataInfo = availableData.length > 0 
          ? ` - ${availableData.join(', ')}`
          : ' - No data available';
        
        result.errors.push(`Row ${rowNumber}: ${validation.error}${dataInfo}`);
        continue;
      }

      validRows.push({
        index: i + 2,
        account: cleaned['Account'],
        tenantName: cleaned['Tenant Name'],
        tenantOwner: cleaned['Tenant Owner'] || null,
      });
    }

    // Step 3: De-duplicate within CSV (same tenant_name + account = same tenant)
    const uniqueTenants = new Map<string, { tenantName: string; account: string; tenantOwner: string | null }>();
    for (const row of validRows) {
      const key = `${row.tenantName}|${row.account}`;
      if (!uniqueTenants.has(key)) {
        uniqueTenants.set(key, {
          tenantName: row.tenantName,
          account: row.account,
          tenantOwner: row.tenantOwner,
        });
      }
    }
    // Step 4: Fetch all existing tenants in one query
    const existingTenantsMap = new Map<string, number>();
    const allExisting = sql`
      SELECT id, tenant_name, account FROM tenants
    `;
    for (const tenant of allExisting.rows) {
      const key = `${tenant.tenant_name}|${tenant.account}`;
      existingTenantsMap.set(key, tenant.id);
    }
    // Step 5: Determine which tenants need inserting
    const tenantsToInsert: Array<{ tenantName: string; account: string; tenantOwner: string | null }> = [];
    for (const [key, tenant] of uniqueTenants) {
      if (!existingTenantsMap.has(key)) {
        tenantsToInsert.push(tenant);
      }
    }
    // Step 6: Bulk insert new tenants inside a SINGLE TRANSACTION
    // Without transaction: each INSERT = 1 fsync (~10ms) → 4844 × 10ms = 48 seconds
    // With transaction: all INSERTs = 1 fsync → < 1 second
    if (tenantsToInsert.length > 0) {
      runInTransaction(() => {
        for (const tenant of tenantsToInsert) {
          try {
            const insertResult = sql`
              INSERT OR IGNORE INTO tenants (tenant_name, account, tenant_owner, is_active)
              VALUES (${tenant.tenantName}, ${tenant.account}, ${tenant.tenantOwner}, 1)
            `;
            const tenantId = insertResult.rows[0]?.id || (insertResult as any).lastInsertRowid;
            if (tenantId) {
              const key = `${tenant.tenantName}|${tenant.account}`;
              existingTenantsMap.set(key, tenantId);
              result.newTenants++;
            }
          } catch (error: any) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
              // Already exists, skip
            } else {
              result.errors.push(`Insert error for ${tenant.tenantName}: ${error.message}`);
            }
          }
        }
      });

      // Re-fetch IDs for any tenants that were INSERT OR IGNORE'd (didn't return lastInsertRowid)
      if (result.newTenants < tenantsToInsert.length) {
        const refetch = sql`SELECT id, tenant_name, account FROM tenants`;
        for (const tenant of refetch.rows) {
          const key = `${tenant.tenant_name}|${tenant.account}`;
          existingTenantsMap.set(key, tenant.id);
        }
      }

    }

    // Step 7: Build mappings (customer ↔ tenant)
    const mappingsToCreate: Array<{ customer_id: string; tenant_id: number }> = [];
    const seenMappingKeys = new Set<string>();
    
    for (const [key, tenant] of uniqueTenants) {
      const tenantId = existingTenantsMap.get(key);
      if (!tenantId) continue;

      const customerId = matchCustomerId(customerByAccount, tenant.account);
      if (customerId) {
        const mappingKey = `${customerId}|${tenantId}`;
        if (!seenMappingKeys.has(mappingKey)) {
          seenMappingKeys.add(mappingKey);
          mappingsToCreate.push({ customer_id: customerId, tenant_id: tenantId });
        }
      }
    }

    // Step 8: Bulk insert mappings in a single transaction
    if (mappingsToCreate.length > 0) {
      // Fetch existing mappings in one query
      const existingMappingKeys = new Set<string>();
      const allMappings = sql`SELECT customer_id, tenant_id FROM customer_tenant_mapping`;
      for (const m of allMappings.rows) {
        existingMappingKeys.add(`${m.customer_id}|${m.tenant_id}`);
      }

      const newMappings = mappingsToCreate.filter(
        m => !existingMappingKeys.has(`${m.customer_id}|${m.tenant_id}`)
      );

      if (newMappings.length > 0) {
        runInTransaction(() => {
          for (const mapping of newMappings) {
            try {
              sql`
                INSERT OR IGNORE INTO customer_tenant_mapping (customer_id, tenant_id)
                VALUES (${mapping.customer_id}, ${mapping.tenant_id})
              `;
            } catch (error: any) {
              // Ignore duplicate errors
            }
          }
        });
      }

    }

    // Final counts
    result.skippedDuplicates = uniqueTenants.size - result.newTenants;

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error importing tenants:', error);
    return new Response(JSON.stringify({ error: 'Failed to import tenants', details: (error as any).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
