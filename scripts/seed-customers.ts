/**
 * Optional dev seed: POST sample customers to the API (no constants.ts dependency).
 * Run: npx tsx scripts/seed-customers.ts
 * API: npm run dev:api (port 3001)
 */
const API_BASE = process.env.API_BASE ?? 'http://localhost:3001';

const SAMPLE_CUSTOMERS: Array<{
  id: string;
  name: string;
  domain: string;
  segment: string;
  mrr: number;
  status: string;
  contract_end: string | null;
  account_manager: string | null;
}> = [
  {
    id: '1',
    name: 'Acme Corp',
    domain: 'acme.com',
    segment: 'Growth',
    mrr: 5000,
    status: 'Onboarding',
    contract_end: '2024-12-31',
    account_manager: 'Alice Smith',
  },
  {
    id: '2',
    name: 'Globex Inc',
    domain: 'globex.com',
    segment: 'Enterprise',
    mrr: 12000,
    status: 'At Risk',
    contract_end: '2024-06-30',
    account_manager: 'Bob Jones',
  },
  {
    id: '3',
    name: 'Soylent Corp',
    domain: 'soylent.co',
    segment: 'Growth',
    mrr: 8500,
    status: 'Active',
    contract_end: '2025-01-15',
    account_manager: 'Alice Smith',
  },
];

async function seed() {
  for (const c of SAMPLE_CUSTOMERS) {
    try {
      const res = await fetch(`${API_BASE}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: c.id,
          name: c.name,
          domain: c.domain,
          segment: c.segment,
          mrr: c.mrr,
          status: c.status,
          contract_end: c.contract_end,
          account_manager: c.account_manager,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn('Seed:', c.name, '-', res.status, text);
      }
    } catch (err) {
      console.error('Seed error', c.name, err);
    }
  }
}

seed();
