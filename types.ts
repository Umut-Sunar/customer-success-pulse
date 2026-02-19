export type CustomerStatus = 'Onboarding' | 'Active' | 'At Risk' | 'Churned';
export type ChurnRiskLevel = 'High' | 'Medium' | 'Low';

export interface ZohoDeskStats {
  openTickets: number;
  avgResponseTimeHours: number; // e.g., 2.5
  avgResolutionTimeDays: number; // e.g., 1.2
  slaScore: number; // 0-100 percentage
  slaBreached: boolean;
  lastTicketDate: string;
  ticketTrend: number[]; // Array of last 7 days ticket counts
}

export interface OnboardingDetails {
  startDate: string;
  dueDate: string;
  actualEndDate?: string;
  progress: number; // 0-100
  bottleneck?: string; // Optional bottleneck description
  stage: 'Kickoff' | 'Integration' | 'Data Migration' | 'Training' | 'Go-Live' | 'Completed';
}

export interface ActiveDetails {
  churnRisk: ChurnRiskLevel;
  churnProbability: number; // 0-100 percentage
  healthScore: number; // 0-100
  satisfactionScore: number; // 0-10 (NPS or CSAT)
  techIssues: string[]; // List of current technical blockers
}

import { Tenant } from './tenant';

export interface Customer {
  id: string;
  name: string;
  domain: string;
  segment: string; // e.g. "Growth", "Enterprise"
  contractEndDate: string;
  mrr: number;
  products: string[]; // e.g. ['Air Export', 'Customs']
  originCountry?: string; // e.g. 'TR'
  destinationCountry?: string; // e.g. 'DE'
  status: CustomerStatus;
  accountManager: string;
  lastTouchDate: string;
  touchedThisWeek: boolean;
  zohoStats: ZohoDeskStats;
  onboarding?: OnboardingDetails;
  active?: ActiveDetails;
  notes: string; // Last meeting points
  logoUrl?: string;
  tenants?: Tenant[]; // Associated tenants
}
