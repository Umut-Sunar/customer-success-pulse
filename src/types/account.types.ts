export type AccountClientStatus = 'Setup' | 'Live' | 'Churned';

export interface Account {
  id: string;
  account_name: string;
  country: string | null;
  service_country: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountClient {
  id: string;
  account_id: string;
  client_name: string;
  tenant_name: string | null;
  mrr: number;
  project_manager: string | null;
  status: AccountClientStatus;
  created_at: string;
  updated_at: string;
}

export interface AccountWithClients extends Account {
  clients: AccountClient[];
  total_mrr: number;
  client_count: number;
  primary_pm: string | null;
  dominant_status: AccountClientStatus;
}

export interface CreateAccountInput {
  account_name: string;
  country?: string;
  service_country?: string;
  clients: CreateAccountClientInput[];
}

export interface CreateAccountClientInput {
  client_name: string;
  tenant_name?: string;
  mrr?: number;
  project_manager?: string;
  status?: AccountClientStatus;
}
