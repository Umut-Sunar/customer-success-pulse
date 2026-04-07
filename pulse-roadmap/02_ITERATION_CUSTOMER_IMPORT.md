# İterasyon 2 — Customer Import (Admin Panel + Excel/CSV)

## Durum
```
[ ] 2.1 — Customer CSV import API
[ ] 2.2 — CustomerImport component (Admin paneline tab ekle)
[ ] 2.3 — Customer listesi Admin'de göster + CRUD
[ ] 2.4 — Onboarding details upsert UI
```

---

## ⚠️ Kullanıcı Etkileşimi

Bu iterasyon tamamlandıktan sonra Admin panelinde şunları yapabilirsin:

**Import için CSV formatı** (bu başlıklar zorunlu):
```
name, domain, segment, mrr, status, contract_start, contract_end, account_manager
```

**status değerleri:** Onboarding, Active, At Risk, Churned
**segment değerleri:** Enterprise, Mid-Market, SMB

---

## Cursor Prompt

```
Continue Pulse CS. Iteration 1 (customers table + API) is complete.
Now add Customer management to the Admin panel.
DO NOT modify Meeting Intel, Sales Orders, Dashboard, CustomerTable, or CustomerDetail.
Admin panel currently has TenantUpload and TenantTable tabs.

## Step 2.1 — Create api/customers/import.ts

POST /api/customers/import — Bulk import customers from CSV/JSON array

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { sql, ensureDatabaseInitialized } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureDatabaseInitialized();
  if (req.method !== 'POST') return res.status(405).end();

  const customers: Array<Record<string, string>> = req.body;
  if (!Array.isArray(customers)) return res.status(400).json({ error: 'Array expected' });

  let added = 0, skipped = 0;
  const errors: string[] = [];

  for (const row of customers) {
    if (!row.name) { errors.push(`Row missing name: ${JSON.stringify(row)}`); continue; }
    try {
      await sql`
        INSERT INTO customers (id, name, domain, segment, mrr, status, contract_start, contract_end, account_manager)
        VALUES (
          ${uuidv4()},
          ${row.name.trim()},
          ${(row.domain || '').trim()},
          ${row.segment || 'Mid-Market'},
          ${parseFloat(row.mrr || '0') || 0},
          ${row.status || 'Active'},
          ${row.contract_start || null},
          ${row.contract_end || null},
          ${row.account_manager || null}
        )
        ON CONFLICT DO NOTHING
      `;
      added++;
    } catch (e) {
      skipped++;
      errors.push(String(e));
    }
  }

  return res.status(200).json({ added, skipped, errors });
}
```

## Step 2.2 — Create components/admin/CustomerImport.tsx

A CSV upload component similar to TenantUpload, but for customers.

Features:
- File drag-drop zone (CSV only)
- Parse with PapaParse
- Show preview table of first 5 rows before import
- Required columns validation: name (others optional)
- POST to /api/customers/import
- Show result: X added, Y skipped, errors list
- "Download Template" button that creates a CSV with headers

Key logic:
```typescript
import Papa from 'papaparse';

const REQUIRED_HEADERS = ['name'];
const OPTIONAL_HEADERS = ['domain', 'segment', 'mrr', 'status', 
                          'contract_start', 'contract_end', 'account_manager'];

// After parse, normalize headers to lowercase
const normalized = rows.map(row => {
  const n: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    n[k.toLowerCase().trim()] = String(v || '').trim();
  }
  return n;
});
```

UI structure:
```
CustomerImport
├── Drop zone (dashed border, upload icon)
├── [if file selected] Preview table (first 5 rows)
├── Validation warnings (missing required columns)
├── "Import X customers" button
└── Result panel (added/skipped counts, error list)
```

## Step 2.3 — Create components/admin/CustomerTable_Admin.tsx

A management table for customers (different from the main CustomerTable which shows customer detail).
Name it CustomerManagementTable to avoid collision.

Features:
- Fetch from GET /api/customers
- Search by name/domain
- Status filter dropdown
- Columns: Name, Domain, Segment, MRR ($), Status, Account Manager, Actions
- Actions: Edit (inline modal), Delete (confirm dialog)
- Status badge colors:
  - Onboarding: blue
  - Active: green
  - At Risk: red
  - Churned: gray
- "Add Customer" button → opens a form modal
- MRR formatted as "$X,XXX"

## Step 2.4 — Update components/admin/AdminPanel.tsx

ADD two new tabs to the existing admin panel:
"Customers" tab → renders CustomerManagementTable + CustomerImport side by side
"Tenants" tab (existing) → unchanged
"Tenant Upload" tab (existing) → unchanged

Keep existing tab structure exactly as is, just add new "Customers" tab as the FIRST tab.

## Verification Checklist
- [ ] Admin panel has new "Customers" tab
- [ ] CustomerImport: upload a CSV → customers appear in DB
- [ ] CustomerManagementTable: shows all customers from DB
- [ ] Edit customer: changes persisted in DB
- [ ] Delete customer: removed from DB
- [ ] GET /api/customers returns seeded customers
- [ ] All existing Admin tenant functionality unchanged
- [ ] Build passes

## Progress Log
- Date: ___
- Customers imported: ___
- Notes: ___
```
