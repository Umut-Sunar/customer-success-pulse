export interface Tenant {
  id: number;
  tenant_name: string;
  account: string;
  tenant_owner: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantImportResult {
  totalRows: number;
  newTenants: number;
  skippedDuplicates: number;
  errors: string[];
}

export interface TenantCSVRow {
  'Tenant Name': string;
  'Account': string;
  'Tenant Owner': string;
}

