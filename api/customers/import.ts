import { v4 as uuidv4 } from 'uuid';
import { sql, ensureDatabaseInitialized } from '../../lib/db';

const VALID_STATUS = ['Onboarding', 'Active', 'At Risk', 'Churned'];
const VALID_SEGMENT = ['Enterprise', 'Mid-Market', 'SMB', 'Growth'];

function normalizeStatus(s: string): string {
  const v = (s || 'Active').trim();
  return VALID_STATUS.includes(v) ? v : 'Active';
}

function normalizeSegment(s: string): string {
  const v = (s || 'Mid-Market').trim();
  return VALID_SEGMENT.includes(v) ? v : 'Mid-Market';
}

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
    if (!Array.isArray(body)) {
      return new Response(JSON.stringify({ error: 'Array expected' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < body.length; i++) {
      const row = body[i] as Record<string, unknown>;
      const name = row?.name != null ? String(row.name).trim() : '';
      if (!name) {
        errors.push(`Row ${i + 1}: missing name`);
        skipped++;
        continue;
      }
      const domain = (row?.domain != null ? String(row.domain) : '').trim();
      const segment = normalizeSegment(row?.segment != null ? String(row.segment) : '');
      const mrr = parseFloat(row?.mrr != null ? String(row.mrr) : '0') || 0;
      const status = normalizeStatus(row?.status != null ? String(row.status) : '');
      const contract_start = row?.contract_start != null ? String(row.contract_start).trim() || null : null;
      const contract_end = row?.contract_end != null ? String(row.contract_end).trim() || null : null;
      const account_manager = row?.account_manager != null ? String(row.account_manager).trim() || null : null;
      const id = uuidv4();

      try {
        sql`
          INSERT INTO customers (id, name, domain, segment, mrr, status, contract_start, contract_end, account_manager)
          VALUES (${id}, ${name}, ${domain}, ${segment}, ${mrr}, ${status}, ${contract_start}, ${contract_end}, ${account_manager})
        `;
        added++;
      } catch (e) {
        skipped++;
        errors.push(`Row ${i + 1} (${name}): ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return new Response(
      JSON.stringify({ added, skipped, errors }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Import failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
