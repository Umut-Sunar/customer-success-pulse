export type CustomerStatus = 'Onboarding' | 'Active' | 'At Risk' | 'Churned';
export type CustomerSegment = 'Enterprise' | 'Mid-Market' | 'SMB' | 'Growth';

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

/** Persisted account notes (Iteration 7) */
export interface CustomerNote {
  id: number;
  customer_id: string;
  content: string;
  author: string | null;
  created_at: string;
}
