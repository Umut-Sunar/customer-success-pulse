import { sql, ensureDatabaseInitialized } from '../../lib/db';
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

    // Parse CSV
    const rows = await parseCSV(file);
    const result: TenantImportResult = {
      totalRows: rows.length,
      newTenants: 0,
      skippedDuplicates: 0,
      errors: [],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cleaned = cleanTenantData(row);
      
      // Validate row
      const validation = validateTenantRow(cleaned);
      if (!validation.valid) {
        result.errors.push(`Row ${i + 2}: ${validation.error}`);
        continue;
      }

      // Check if tenant already exists
      const existing = await sql`
        SELECT id FROM tenants
        WHERE tenant_name = ${cleaned['Tenant Name']}
        AND account = ${cleaned['Account']}
      `;

      if (existing.rows.length > 0) {
        result.skippedDuplicates++;
        continue;
      }

      // Insert new tenant
      try {
        await sql`
          INSERT INTO tenants (tenant_name, account, tenant_owner, is_active)
          VALUES (${cleaned['Tenant Name']}, ${cleaned['Account']}, ${cleaned['Tenant Owner'] || null}, true)
        `;
        result.newTenants++;
      } catch (error: any) {
        if (error.code === '23505') {
          result.skippedDuplicates++;
        } else {
          result.errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error importing tenants:', error);
    return new Response(JSON.stringify({ error: 'Failed to import tenants' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

