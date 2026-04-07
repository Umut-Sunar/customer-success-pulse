import { sql, ensureDatabaseInitialized } from '../../../lib/db';
import type { OnboardingDetails } from '../../../src/types/customer.types';

function rowToOnboarding(row: Record<string, unknown>, customerId: string): OnboardingDetails {
  return {
    id: Number(row.id),
    customer_id: customerId,
    stage: String(row.stage ?? 'Requirements'),
    go_live_date: row.go_live_date != null ? String(row.go_live_date) : null,
    committed_live_date: row.committed_live_date != null ? String(row.committed_live_date) : null,
    bottleneck: row.bottleneck != null ? String(row.bottleneck) : null,
    progress: Number(row.progress ?? 0),
    notes: row.notes != null ? String(row.notes) : null,
  };
}

export default async function handler(req: Request) {
  await ensureDatabaseInitialized();
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = pathParts[pathParts.length - 2];
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid customer ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'PUT') {
    try {
      const body = await req.json();
      const stage = body.stage ?? 'Requirements';
      const go_live_date = body.go_live_date ?? null;
      const committed_live_date = body.committed_live_date ?? null;
      const bottleneck = body.bottleneck ?? null;
      const progress = body.progress ?? 0;
      const notes = body.notes ?? null;

      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.POSTGRES_URL;

      if (isDevelopment) {
        sql`
          INSERT INTO onboarding_details (customer_id, stage, go_live_date, committed_live_date, bottleneck, progress, notes)
          VALUES (${id}, ${stage}, ${go_live_date}, ${committed_live_date}, ${bottleneck}, ${progress}, ${notes})
          ON CONFLICT (customer_id) DO UPDATE SET
            stage = excluded.stage,
            go_live_date = excluded.go_live_date,
            committed_live_date = excluded.committed_live_date,
            bottleneck = excluded.bottleneck,
            progress = excluded.progress,
            notes = excluded.notes,
            updated_at = datetime('now')
        `;
      } else {
        sql`
          INSERT INTO onboarding_details (customer_id, stage, go_live_date, committed_live_date, bottleneck, progress, notes)
          VALUES (${id}, ${stage}, ${go_live_date}, ${committed_live_date}, ${bottleneck}, ${progress}, ${notes})
          ON CONFLICT (customer_id) DO UPDATE SET
            stage = EXCLUDED.stage,
            go_live_date = EXCLUDED.go_live_date,
            committed_live_date = EXCLUDED.committed_live_date,
            bottleneck = EXCLUDED.bottleneck,
            progress = EXCLUDED.progress,
            notes = EXCLUDED.notes,
            updated_at = NOW()
        `;
      }

      const selectResult = sql`
        SELECT * FROM onboarding_details WHERE customer_id = ${id}
      `;
      const rows = selectResult.rows ?? [];
      if (rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Upsert failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const row = rows[0] as Record<string, unknown>;
      return new Response(JSON.stringify(rowToOnboarding(row, id)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error upserting onboarding:', error);
      return new Response(JSON.stringify({ error: 'Failed to save onboarding details' }), {
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
