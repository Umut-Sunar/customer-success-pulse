import { initDatabase } from '../lib/db';

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await initDatabase();
    return new Response(JSON.stringify({ message: 'Database initialized successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error initializing database:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to initialize database' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

