// Database connection - Environment-based selection
// Development: SQLite (local)
// Production: Vercel Postgres

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.POSTGRES_URL;

// Lazy load database modules
let sql: any;
let initDatabase: () => Promise<boolean> | boolean;
let ensureDatabaseInitialized: () => Promise<void> | void;
let runInTransaction: <T>(fn: () => T) => T;

async function loadDatabase() {
  if (isDevelopment) {
    // Use SQLite for local development
    const sqliteDb = await import('./db-local.js');
    sql = sqliteDb.sql;
    initDatabase = sqliteDb.initDatabase;
    ensureDatabaseInitialized = sqliteDb.ensureDatabaseInitialized;
    runInTransaction = sqliteDb.runInTransaction;
    console.log('📦 Using SQLite database for local development');
  } else {
    // Use Vercel Postgres for production
    const { sql: postgresSql } = await import('@vercel/postgres');
    sql = postgresSql;
    
    // Wrap Vercel Postgres initDatabase to match SQLite signature
    initDatabase = async () => {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS tenants (
            id SERIAL PRIMARY KEY,
            tenant_name VARCHAR(255) NOT NULL,
            account VARCHAR(255) NOT NULL,
            tenant_owner VARCHAR(255),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(tenant_name, account)
          );
        `;

        await sql`
          CREATE INDEX IF NOT EXISTS idx_tenants_account ON tenants(account);
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);
        `;

        await sql`
          CREATE TABLE IF NOT EXISTS customer_tenant_mapping (
            id SERIAL PRIMARY KEY,
            customer_id VARCHAR(255) NOT NULL,
            tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(customer_id, tenant_id)
          );
        `;

        await sql`
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
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_customers_domain ON customers(domain);`;

        await sql`
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
        `;

        await sql`
          CREATE TABLE IF NOT EXISTS customer_notes (
            id SERIAL PRIMARY KEY,
            customer_id VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            author VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW()
          );
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_notes_customer ON customer_notes(customer_id);`;

        await sql`
          CREATE TABLE IF NOT EXISTS accounts (
            id VARCHAR(255) PRIMARY KEY,
            account_name VARCHAR(255) NOT NULL UNIQUE,
            country VARCHAR(255),
            service_country VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(account_name);`;

        await sql`
          CREATE TABLE IF NOT EXISTS account_clients (
            id VARCHAR(255) PRIMARY KEY,
            account_id VARCHAR(255) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            client_name VARCHAR(255) NOT NULL,
            tenant_name VARCHAR(255),
            mrr DECIMAL(10,2) DEFAULT 0,
            project_manager VARCHAR(255),
            status VARCHAR(50) DEFAULT 'Setup' CHECK(status IN ('Setup','Live','Churned')),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_account_clients_account ON account_clients(account_id);`;

        console.log('Vercel Postgres database schema initialized successfully');
        return true;
      } catch (error) {
        console.error('Error initializing Vercel Postgres database:', error);
        throw error;
      }
    };

    ensureDatabaseInitialized = async () => {
      try {
        await initDatabase();
      } catch (error) {
        console.error('Failed to auto-initialize Vercel Postgres database:', error);
      }
    };

    // Postgres doesn't need explicit transaction wrapping for simple operations
    runInTransaction = (fn) => fn();
    
    console.log('☁️ Using Vercel Postgres database for production');
  }
}

// Initialize database module
await loadDatabase();

export interface Tenant {
  id: number;
  tenant_name: string;
  account: string;
  tenant_owner: string | null;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CustomerTenantMapping {
  id: number;
  customer_id: string;
  tenant_id: number;
  created_at: Date | string;
}

export { sql, initDatabase, ensureDatabaseInitialized, runInTransaction };
