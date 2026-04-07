# İterasyon 1 — DB Schema + Customers API

## Durum
```
[ ] 1.1 — customers tablosu DB'ye ekle
[ ] 1.2 — onboarding_details tablosu ekle
[ ] 1.3 — /api/customers endpoint'leri
[ ] 1.4 — TypeScript tipleri
[ ] 1.5 — Seed data (mevcut mock'u DB'ye aktar)
```

---

## Cursor Prompt

```
I'm extending the Pulse CS app (React + TypeScript + Vite + Vercel Postgres + SQLite dev).
The existing DB has `tenants` and `customer_tenant_mapping` tables.
DO NOT modify any existing files except lib/db.ts (schema addition only).
DO NOT touch Auth, Admin, Meeting Intel, Sales Orders, or CSV upload logic.

## Step 1.1 — Extend lib/db.ts schema

In the `initDatabase()` function, ADD these CREATE TABLE statements
AFTER the existing tenant tables (do not modify existing CREATE TABLE statements):

```sql
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  segment VARCHAR(100) DEFAULT 'Mid-Market',
  mrr DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Active',
  contract_start DATE,
  contract_end DATE,
  account_manager VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_domain ON customers(domain);

CREATE TABLE IF NOT EXISTS onboarding_details (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stage VARCHAR(100) DEFAULT 'Requirements',
  go_live_date DATE,
  committed_live_date DATE,
  bottleneck TEXT,
  progress INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id)
);
```

## Step 1.2 — Create src/types/customer.types.ts

```typescript
export type CustomerStatus = 'Onboarding' | 'Active' | 'At Risk' | 'Churned';
export type CustomerSegment = 'Enterprise' | 'Mid-Market' | 'SMB';

export interface Customer {
  id: string;
  name: string;
  domain: string;
  segment: CustomerSegment;
  mrr: number;
  status: CustomerStatus;
  contract_start: string | null;
  contract_end: string | null;
  account_manager: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields (joined from other sources)
  health_score?: number;
  touch_status?: 'Touched' | 'Untouched';
  churn_risk?: 'none' | 'low' | 'medium' | 'high';
  last_meeting_date?: string;
  tenant_count?: number;
}

export interface OnboardingDetails {
  id: number;
  customer_id: string;
  stage: string;
  go_live_date: string | null;
  committed_live_date: string | null;
  bottleneck: string | null;
  progress: number;
  notes: string | null;
}

export interface CustomerWithOnboarding extends Customer {
  onboarding?: OnboardingDetails;
}

export interface CreateCustomerInput {
  id?: string;
  name: string;
  domain: string;
  segment?: CustomerSegment;
  mrr?: number;
  status?: CustomerStatus;
  contract_start?: string;
  contract_end?: string;
  account_manager?: string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {}
```

## Step 1.3 — Create api/customers/index.ts

GET /api/customers — List all customers (with optional status filter)
POST /api/customers — Create a customer

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { sql, ensureDatabaseInitialized } from '../../lib/db';
import { CreateCustomerInput } from '../../src/types/customer.types';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureDatabaseInitialized();

  if (req.method === 'GET') {
    const { status } = req.query;
    let result;
    if (status && status !== 'All') {
      result = await sql`SELECT * FROM customers WHERE status = ${status} ORDER BY name`;
    } else {
      result = await sql`SELECT * FROM customers ORDER BY name`;
    }
    return res.status(200).json(result.rows ?? result);
  }

  if (req.method === 'POST') {
    const body: CreateCustomerInput = req.body;
    if (!body.name) return res.status(400).json({ error: 'name is required' });
    const id = body.id || uuidv4();
    const result = await sql`
      INSERT INTO customers (id, name, domain, segment, mrr, status, contract_start, contract_end, account_manager)
      VALUES (${id}, ${body.name}, ${body.domain || ''}, ${body.segment || 'Mid-Market'},
              ${body.mrr || 0}, ${body.status || 'Active'}, ${body.contract_start || null},
              ${body.contract_end || null}, ${body.account_manager || null})
      ON CONFLICT (id) DO NOTHING
      RETURNING *
    `;
    return res.status(201).json((result.rows ?? result)[0]);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
```

## Step 1.4 — Create api/customers/[id].ts

GET, PUT, DELETE for a single customer.

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { sql, ensureDatabaseInitialized } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureDatabaseInitialized();
  const { id } = req.query;

  if (req.method === 'GET') {
    const result = await sql`
      SELECT c.*, o.stage, o.go_live_date, o.committed_live_date,
             o.bottleneck, o.progress, o.notes as onboarding_notes
      FROM customers c
      LEFT JOIN onboarding_details o ON o.customer_id = c.id
      WHERE c.id = ${id}
    `;
    const rows = result.rows ?? result;
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(rows[0]);
  }

  if (req.method === 'PUT') {
    const body = req.body;
    const result = await sql`
      UPDATE customers SET
        name = COALESCE(${body.name}, name),
        domain = COALESCE(${body.domain}, domain),
        segment = COALESCE(${body.segment}, segment),
        mrr = COALESCE(${body.mrr}, mrr),
        status = COALESCE(${body.status}, status),
        contract_start = COALESCE(${body.contract_start}, contract_start),
        contract_end = COALESCE(${body.contract_end}, contract_end),
        account_manager = COALESCE(${body.account_manager}, account_manager),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return res.status(200).json((result.rows ?? result)[0]);
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM customers WHERE id = ${id}`;
    return res.status(200).json({ message: 'Deleted' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
```

## Step 1.5 — Create api/customers/[id]/onboarding.ts

PUT /api/customers/[id]/onboarding — Upsert onboarding details

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { sql, ensureDatabaseInitialized } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureDatabaseInitialized();
  const { id } = req.query;

  if (req.method === 'PUT') {
    const body = req.body;
    const result = await sql`
      INSERT INTO onboarding_details
        (customer_id, stage, go_live_date, committed_live_date, bottleneck, progress, notes)
      VALUES
        (${id}, ${body.stage || 'Requirements'}, ${body.go_live_date || null},
         ${body.committed_live_date || null}, ${body.bottleneck || null},
         ${body.progress || 0}, ${body.notes || null})
      ON CONFLICT (customer_id) DO UPDATE SET
        stage = EXCLUDED.stage,
        go_live_date = EXCLUDED.go_live_date,
        committed_live_date = EXCLUDED.committed_live_date,
        bottleneck = EXCLUDED.bottleneck,
        progress = EXCLUDED.progress,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `;
    return res.status(200).json((result.rows ?? result)[0]);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
```

## Step 1.6 — Create hooks/useCustomers.ts

```typescript
import { useState, useEffect } from 'react';
import { Customer } from '../src/types/customer.types';

export function useCustomers(status?: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const url = status && status !== 'All'
        ? `/api/customers?status=${status}`
        : '/api/customers';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      setCustomers(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [status]);

  return { customers, loading, error, refetch: fetchCustomers };
}

export async function createCustomer(data: Partial<Customer>) {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateCustomer(id: string, data: Partial<Customer>) {
  const res = await fetch(`/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

## Step 1.7 — Add uuid package

Run: npm install uuid @types/uuid

## Step 1.8 — Seed script: scripts/seed-customers.ts

Convert existing MOCK_CUSTOMERS to real DB entries. This runs once.

```typescript
// scripts/seed-customers.ts
// Run with: npx ts-node scripts/seed-customers.ts
import { MOCK_CUSTOMERS } from '../constants';

async function seed() {
  for (const c of MOCK_CUSTOMERS) {
    await fetch('http://localhost:3001/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: c.id,
        name: c.name,
        domain: c.domain,
        segment: c.segment,
        mrr: c.mrr,
        status: c.status,
        contract_end: c.contractEndDate,
        account_manager: c.accountManager,
      }),
    });
    console.log('Seeded:', c.name);
  }
}
seed();
```

## Verification Checklist
- [ ] npm run build — zero TS errors
- [ ] GET /api/customers returns empty array (no data yet)
- [ ] POST /api/customers creates a customer
- [ ] GET /api/customers/[id] returns that customer
- [ ] onboarding_details table exists in DB
- [ ] Existing app (Dashboard, Accounts, Admin) unchanged

## Progress Log
- Date: ___
- Notes: ___
```
