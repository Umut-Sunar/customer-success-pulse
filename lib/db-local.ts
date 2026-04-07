import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite database file path
const dbPath = path.join(__dirname, '..', 'tenant-data.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export interface Tenant {
  id: number;
  tenant_name: string;
  account: string;
  tenant_owner: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerTenantMapping {
  id: number;
  customer_id: string;
  tenant_id: number;
  created_at: string;
}

// Initialize database schema
export function initDatabase() {
  try {
    // Create tenants table
    db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_name TEXT NOT NULL,
        account TEXT NOT NULL,
        tenant_owner TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(tenant_name, account)
      );
    `);

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tenants_account ON tenants(account);
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);
    `);

    // Create customer_tenant_mapping table
    db.exec(`
      CREATE TABLE IF NOT EXISTS customer_tenant_mapping (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT NOT NULL,
        tenant_id INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(customer_id, tenant_id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );
    `);

    // Create customers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT,
        segment TEXT DEFAULT 'Mid-Market',
        mrr REAL DEFAULT 0,
        status TEXT DEFAULT 'Active',
        contract_start TEXT,
        contract_end TEXT,
        account_manager TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_domain ON customers(domain);`);

    // Create onboarding_details table
    db.exec(`
      CREATE TABLE IF NOT EXISTS onboarding_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT NOT NULL,
        stage TEXT DEFAULT 'Requirements',
        go_live_date TEXT,
        committed_live_date TEXT,
        bottleneck TEXT,
        progress INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(customer_id),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS customer_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_notes_customer ON customer_notes(customer_id);`);

    db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        account_name TEXT NOT NULL UNIQUE,
        country TEXT,
        service_country TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(account_name);`);

    db.exec(`
      CREATE TABLE IF NOT EXISTS account_clients (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        client_name TEXT NOT NULL,
        tenant_name TEXT,
        mrr REAL DEFAULT 0,
        project_manager TEXT,
        status TEXT DEFAULT 'Setup' CHECK(status IN ('Setup','Live','Churned')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_account_clients_account ON account_clients(account_id);`);

    console.log('SQLite database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    throw error;
  }
}

// SQL query wrapper to match Vercel Postgres API
// Template literal support for Vercel Postgres style queries
function sqlTemplate(strings: TemplateStringsArray, ...values: any[]) {
  let query = strings[0];
  const params: any[] = [];
  
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    
    // Handle sql.raw() calls
    if (value && typeof value === 'object' && value.__isRaw === true) {
      query += value.value + strings[i + 1];
    } else {
      params.push(value);
      query += '?' + strings[i + 1];
    }
  }
  
  // Determine if it's a SELECT query
  const isSelect = query.trim().toUpperCase().startsWith('SELECT');
  
  if (isSelect) {
    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return {
      rows: rows,
    };
  } else {
    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    return {
      rows: result.lastInsertRowid ? [{ id: result.lastInsertRowid }] : [],
      rowCount: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }
}

// Add raw SQL helper
sqlTemplate.raw = (value: string) => ({
  __isRaw: true,
  value,
});

// Create sql object that works with template literals (Vercel Postgres style)
export const sql = new Proxy(sqlTemplate as any, {
  get: (target, prop) => {
    if (prop === 'raw') {
      return sqlTemplate.raw;
    }
    return sqlTemplate;
  },
});

// Auto-initialize on first import
let initialized = false;
export function ensureDatabaseInitialized() {
  if (!initialized) {
    try {
      initDatabase();
      initialized = true;
    } catch (error) {
      console.error('Failed to auto-initialize SQLite database:', error);
    }
  }
}

// Initialize on module load
ensureDatabaseInitialized();

// Transaction helper for batch operations
// Wraps all operations in a single SQLite transaction (100x+ faster for bulk inserts)
export function runInTransaction<T>(fn: () => T): T {
  const transaction = db.transaction(fn);
  return transaction();
}

export { db };
export default db;
