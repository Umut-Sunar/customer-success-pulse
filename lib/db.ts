import { sql } from '@vercel/postgres';

export interface Tenant {
  id: number;
  tenant_name: string;
  account: string;
  tenant_owner: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerTenantMapping {
  id: number;
  customer_id: string;
  tenant_id: number;
  created_at: Date;
}

// Initialize database schema
export async function initDatabase() {
  try {
    // Create tenants table
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

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tenants_account ON tenants(account);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);
    `;

    // Create customer_tenant_mapping table
    await sql`
      CREATE TABLE IF NOT EXISTS customer_tenant_mapping (
        id SERIAL PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(customer_id, tenant_id)
      );
    `;

    console.log('Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Auto-initialize on first API call
let initialized = false;
export async function ensureDatabaseInitialized() {
  if (!initialized) {
    try {
      await initDatabase();
      initialized = true;
    } catch (error) {
      console.error('Failed to auto-initialize database:', error);
    }
  }
}

// Get database connection
export { sql };

