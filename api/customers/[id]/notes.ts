import { sql, ensureDatabaseInitialized } from '../../../lib/db';
import type { CustomerNote } from '../../../src/types/customer.types';

function rowToNote(row: Record<string, unknown>): CustomerNote {
  return {
    id: Number(row.id),
    customer_id: String(row.customer_id),
    content: String(row.content ?? ''),
    author: row.author != null ? String(row.author) : null,
    created_at: row.created_at != null ? String(row.created_at) : '',
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

  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.POSTGRES_URL;

  if (req.method === 'GET') {
    try {
      const result = sql`
        SELECT * FROM customer_notes WHERE customer_id = ${id} ORDER BY created_at DESC
      `;
      const rows = (result.rows ?? []) as Record<string, unknown>[];
      return new Response(JSON.stringify(rows.map(rowToNote)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching notes:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch notes' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as { content?: string; author?: string | null };
      const content = typeof body.content === 'string' ? body.content.trim() : '';
      if (!content) {
        return new Response(JSON.stringify({ error: 'content is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const author = body.author != null && body.author !== '' ? String(body.author) : null;

      if (isDevelopment) {
        sql`
          INSERT INTO customer_notes (customer_id, content, author)
          VALUES (${id}, ${content}, ${author})
        `;
        const sel = sql`
          SELECT * FROM customer_notes WHERE customer_id = ${id} ORDER BY id DESC LIMIT 1
        `;
        const row = sel.rows?.[0] as Record<string, unknown> | undefined;
        if (!row) {
          return new Response(JSON.stringify({ error: 'Insert failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify(rowToNote(row)), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const ins = sql`
        INSERT INTO customer_notes (customer_id, content, author)
        VALUES (${id}, ${content}, ${author})
        RETURNING *
      `;
      const rows = ins.rows ?? [];
      if (rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Insert failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(rowToNote(rows[0] as Record<string, unknown>)), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error creating note:', error);
      return new Response(JSON.stringify({ error: 'Failed to create note' }), {
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
