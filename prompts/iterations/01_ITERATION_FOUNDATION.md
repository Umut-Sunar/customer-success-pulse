# İterasyon 1 — Temel Altyapı (Types, Store, Parsers)

## Durum Takibi
```
[ ] 1.1 — Paket kurulumu
[ ] 1.2 — Meeting types
[ ] 1.3 — Sales types
[ ] 1.4 — Zustand store
[ ] 1.5 — meeting-parsers.ts
[ ] 1.6 — csv-parser.ts genişletmesi
```

---

## Cursor'a Verilecek Prompt

```
I'm extending an existing React + TypeScript + Vite + Tailwind app called "Customer Success Pulse".
The existing app uses: Clerk auth, Recharts, PapaParse, SQLite/Postgres, Vercel deployment.
DO NOT modify any existing files unless explicitly told to.

## Step 1.1 — Install packages
Run:
npm install zustand

## Step 1.2 — Create src/types/meeting.types.ts

Create this file with the following TypeScript interfaces exactly:

export interface MeetingMaster {
  meeting_id: string;
  title: string;
  date: string;
  duration_min: number;
  organizer_email: string;
  participants: string;
  is_customer_meeting: boolean;
  external_participants: string;
  internal_participants: string;
  customer_domain: string;
  account_name: string;
  ai_processed: boolean;
  created_at: string;
  meeting_type: string;
  processed_at: string;
  retry_count: number;
}

export interface PMScore {
  meeting_id: string;
  date: string;
  pm_name: string;
  pm_email: string;
  meeting_type: string;
  is_customer_meeting: boolean;
  english_level: string;
  english_vocabulary: string;
  english_grammar: string;
  english_fluency: string;
  english_technical: string;
  english_assessment: string;
  preparation: number;
  preparation_evidence: string;
  preparation_best: string;
  preparation_worst: string;
  customer_mgmt: number;
  customer_mgmt_evidence: string;
  customer_mgmt_best: string;
  customer_mgmt_worst: string;
  tech_mastery: number;
  tech_mastery_evidence: string;
  tech_mastery_best: string;
  tech_mastery_worst: string;
  action_quality: number;
  action_quality_evidence: string;
  action_quality_best: string;
  action_quality_worst: string;
  communication: number;
  communication_evidence: string;
  communication_best: string;
  communication_worst: string;
  overall: number;
  feedback: string;
  key_strengths: string;       // JSON string array
  improvement_areas: string;   // JSON string array
  key_behaviors: string;       // JSON string array
  info_sharing: number;
  decision_making: number;
  time_management: number;
  pm_client_match_score: number;
  pm_client_assessment: string;
  pm_client_strengths: string;  // JSON string array
  pm_client_gaps: string;       // JSON string array
  pm_client_recommendation: string;
}

export interface CustomerInsight {
  meeting_id: string;
  date: string;
  account_name: string;
  customer_domain: string;
  meeting_type: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentiment_score: number;
  sentiment_evidence: string;
  pain_points: string;          // JSON string
  key_needs: string;            // JSON string
  feature_requests: string;     // JSON string
  customer_faq: string;         // JSON string
  satisfaction_signals: string;
  frustration_signals: string;
  pm_client_match_score: number;
  pm_client_assessment: string;
  pm_client_strengths: string;
  pm_client_gaps: string;
  pm_client_recommendation: string;
}

export interface RiskSignal {
  meeting_id: string;
  date: string;
  account_name: string;
  customer_domain: string;
  meeting_type: string;
  churn_risk: 'none' | 'low' | 'medium' | 'high';
  churn_evidence: string;
  churn_indicators: string;     // JSON string array
  escalation_risk: 'none' | 'low' | 'medium' | 'high';
  escalation_evidence: string;
  escalation_triggers: string;  // JSON string array
  risk_keywords: string;
  upsell: string;               // JSON string array
  crosssell: string;            // JSON string array
}

export interface KnowledgeItem {
  meeting_id: string;
  date: string;
  account_name: string;
  meeting_type: string;
  topics_trend: string;         // JSON string array
  is_recurring: boolean;
  recurring_description: string;
  recurrence_evidence: string;
  root_cause_hint: string;
  customer_faq_patterns: string; // JSON string array
  new_feature_demands: string;   // JSON string array
  documentation_gaps: string;    // JSON string array
  next_steps: string;            // JSON string array
}

// Parsed versions (JSON fields expanded)
export interface PainPoint {
  issue: string;
  severity: 'high' | 'medium' | 'low';
  quote: string;
  category: string;
}

export interface UpsellOpportunity {
  product: string;
  signal: string;
  customer_context: string;
  confidence: 'high' | 'medium' | 'low';
  suggested_pitch: string;
}

export interface FeatureRequest {
  feature: string;
  context: string;
  maps_to_product: string;
}

export interface PMScoreAggregated {
  pm_name: string;
  pm_email: string;
  meeting_count: number;
  avg_preparation: number;
  avg_customer_mgmt: number;
  avg_tech_mastery: number;
  avg_action_quality: number;
  avg_communication: number;
  avg_overall: number;
  english_levels: Record<string, number>;
  customer_meeting_count: number;
  internal_meeting_count: number;
  total_duration_min: number;
}

## Step 1.3 — Create src/types/sales.types.ts

export interface SalesOrderPipeline {
  record_id: string;
  subject: string;
  account_name: string;
  churn_date: string;
  churn_reason: string;
  contract_date: string;
  created_by: string;
  created_time: string;
  due_date: string;
  grand_total: number;
  minimum_limit_unit: number;
  opportunity_name: string;
  project_manager: string;
  sales_order_owner: string;
  status: string;
  tenant_name: string;
}

export interface SalesOrderLive {
  record_id: string;
  subject: string;
  account_name: string;
  committed_live_date: string;
  created_by: string;
  created_time: string;
  due_date: string;
  grand_total: number;
  layout: string;
  order_date: string;
  project_manager: string;
  sales_order_owner: string;
  status: string;
  tenant_name: string;
}

## Step 1.4 — Create src/store/dataStore.ts

import { create } from 'zustand';
import { MeetingMaster, PMScore, CustomerInsight, RiskSignal, KnowledgeItem } from '../types/meeting.types';
import { SalesOrderPipeline, SalesOrderLive } from '../types/sales.types';

interface DataStore {
  // Meeting Intelligence data
  meetings: MeetingMaster[];
  pmScores: PMScore[];
  customerInsights: CustomerInsight[];
  riskSignals: RiskSignal[];
  knowledgeItems: KnowledgeItem[];

  // Sales data
  pipelineOrders: SalesOrderPipeline[];
  liveOrders: SalesOrderLive[];

  // Upload tracking
  uploadedFiles: Record<string, boolean>;

  // Actions
  setMeetings: (data: MeetingMaster[]) => void;
  setPmScores: (data: PMScore[]) => void;
  setCustomerInsights: (data: CustomerInsight[]) => void;
  setRiskSignals: (data: RiskSignal[]) => void;
  setKnowledgeItems: (data: KnowledgeItem[]) => void;
  setPipelineOrders: (data: SalesOrderPipeline[]) => void;
  setLiveOrders: (data: SalesOrderLive[]) => void;
  markFileUploaded: (fileKey: string) => void;
  clearAllData: () => void;
}

export const useDataStore = create<DataStore>((set) => ({
  meetings: [],
  pmScores: [],
  customerInsights: [],
  riskSignals: [],
  knowledgeItems: [],
  pipelineOrders: [],
  liveOrders: [],
  uploadedFiles: {},

  setMeetings: (data) => set({ meetings: data }),
  setPmScores: (data) => set({ pmScores: data }),
  setCustomerInsights: (data) => set({ customerInsights: data }),
  setRiskSignals: (data) => set({ riskSignals: data }),
  setKnowledgeItems: (data) => set({ knowledgeItems: data }),
  setPipelineOrders: (data) => set({ pipelineOrders: data }),
  setLiveOrders: (data) => set({ liveOrders: data }),
  markFileUploaded: (fileKey) =>
    set((state) => ({
      uploadedFiles: { ...state.uploadedFiles, [fileKey]: true },
    })),
  clearAllData: () =>
    set({
      meetings: [],
      pmScores: [],
      customerInsights: [],
      riskSignals: [],
      knowledgeItems: [],
      pipelineOrders: [],
      liveOrders: [],
      uploadedFiles: {},
    }),
}));

## Step 1.5 — Create src/lib/meeting-parsers.ts

This file safely parses JSON string fields from Google Sheets CSV exports.

import { PainPoint, UpsellOpportunity, FeatureRequest, PMScore, PMScoreAggregated } from '../types/meeting.types';

export function safeParseJSON<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString || jsonString.trim() === '' || jsonString === 'null') return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

export function parsePainPoints(jsonString: string): PainPoint[] {
  return safeParseJSON<PainPoint[]>(jsonString, []);
}

export function parseUpsellOpportunities(jsonString: string): UpsellOpportunity[] {
  return safeParseJSON<UpsellOpportunity[]>(jsonString, []);
}

export function parseFeatureRequests(jsonString: string): FeatureRequest[] {
  return safeParseJSON<FeatureRequest[]>(jsonString, []);
}

export function parseStringArray(jsonString: string): string[] {
  return safeParseJSON<string[]>(jsonString, []);
}

export function normalizeBool(val: string | boolean | undefined): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
  return false;
}

export function normalizeNumber(val: string | number | undefined): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export function aggregatePMScores(pmScores: PMScore[]): PMScoreAggregated[] {
  const grouped = new Map<string, PMScore[]>();
  
  for (const score of pmScores) {
    const key = score.pm_email || score.pm_name;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(score);
  }

  return Array.from(grouped.entries()).map(([, scores]) => {
    const count = scores.length;
    const avg = (field: keyof PMScore) =>
      scores.reduce((sum, s) => sum + normalizeNumber(s[field] as string), 0) / count;

    const englishLevels: Record<string, number> = {};
    scores.forEach((s) => {
      const lvl = s.english_level || 'N/A';
      englishLevels[lvl] = (englishLevels[lvl] || 0) + 1;
    });

    return {
      pm_name: scores[0].pm_name,
      pm_email: scores[0].pm_email,
      meeting_count: count,
      avg_preparation: avg('preparation'),
      avg_customer_mgmt: avg('customer_mgmt'),
      avg_tech_mastery: avg('tech_mastery'),
      avg_action_quality: avg('action_quality'),
      avg_communication: avg('communication'),
      avg_overall: avg('overall'),
      english_levels: englishLevels,
      customer_meeting_count: scores.filter((s) => normalizeBool(s.is_customer_meeting)).length,
      internal_meeting_count: scores.filter((s) => !normalizeBool(s.is_customer_meeting)).length,
      total_duration_min: 0, // Will be joined with meetings data
    };
  });
}

## Step 1.6 — Extend src/lib/csv-parser.ts

ADD these functions to the existing csv-parser.ts WITHOUT modifying existing functions:

import Papa from 'papaparse';
import { MeetingMaster, PMScore, CustomerInsight, RiskSignal, KnowledgeItem } from '../types/meeting.types';
import { SalesOrderPipeline, SalesOrderLive } from '../types/sales.types';
import { normalizeBool, normalizeNumber } from './meeting-parsers';

function normalizeHeaders(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    normalized[key.toLowerCase().trim().replace(/\s+/g, '_')] = row[key];
  }
  return normalized;
}

export async function parseMeetingsMasterCSV(file: File): Promise<MeetingMaster[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as Record<string, unknown>[]).map((r) => {
          const n = normalizeHeaders(r);
          return {
            meeting_id: String(n.meeting_id || ''),
            title: String(n.title || ''),
            date: String(n.date || ''),
            duration_min: normalizeNumber(n.duration_min as string),
            organizer_email: String(n.organizer_email || ''),
            participants: String(n.participants || ''),
            is_customer_meeting: normalizeBool(n.is_customer_meeting as string),
            external_participants: String(n.external_participants || ''),
            internal_participants: String(n.internal_participants || ''),
            customer_domain: String(n.customer_domain || ''),
            account_name: String(n.account_name || ''),
            ai_processed: normalizeBool(n.ai_processed as string),
            created_at: String(n.created_at || ''),
            meeting_type: String(n.meeting_type || ''),
            processed_at: String(n.processed_at || ''),
            retry_count: normalizeNumber(n.retry_count as string),
          } as MeetingMaster;
        });
        resolve(rows.filter((r) => r.meeting_id));
      },
      error: reject,
    });
  });
}

export async function parsePMScoresCSV(file: File): Promise<PMScore[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as Record<string, unknown>[]).map((r) => {
          const n = normalizeHeaders(r);
          return {
            meeting_id: String(n.meeting_id || ''),
            date: String(n.date || ''),
            pm_name: String(n.pm_name || ''),
            pm_email: String(n.pm_email || ''),
            meeting_type: String(n.meeting_type || ''),
            is_customer_meeting: normalizeBool(n.is_customer_meeting as string),
            english_level: String(n.english_level || 'N/A'),
            english_vocabulary: String(n.english_vocabulary || ''),
            english_grammar: String(n.english_grammar || ''),
            english_fluency: String(n.english_fluency || ''),
            english_technical: String(n.english_technical || ''),
            english_assessment: String(n.english_assessment || ''),
            preparation: normalizeNumber(n.preparation as string),
            preparation_evidence: String(n.preparation_evidence || ''),
            preparation_best: String(n.preparation_best || ''),
            preparation_worst: String(n.preparation_worst || ''),
            customer_mgmt: normalizeNumber(n.customer_mgmt as string),
            customer_mgmt_evidence: String(n.customer_mgmt_evidence || ''),
            customer_mgmt_best: String(n.customer_mgmt_best || ''),
            customer_mgmt_worst: String(n.customer_mgmt_worst || ''),
            tech_mastery: normalizeNumber(n.tech_mastery as string),
            tech_mastery_evidence: String(n.tech_mastery_evidence || ''),
            tech_mastery_best: String(n.tech_mastery_best || ''),
            tech_mastery_worst: String(n.tech_mastery_worst || ''),
            action_quality: normalizeNumber(n.action_quality as string),
            action_quality_evidence: String(n.action_quality_evidence || ''),
            action_quality_best: String(n.action_quality_best || ''),
            action_quality_worst: String(n.action_quality_worst || ''),
            communication: normalizeNumber(n.communication as string),
            communication_evidence: String(n.communication_evidence || ''),
            communication_best: String(n.communication_best || ''),
            communication_worst: String(n.communication_worst || ''),
            overall: normalizeNumber(n.overall as string),
            feedback: String(n.feedback || ''),
            key_strengths: String(n.key_strengths || '[]'),
            improvement_areas: String(n.improvement_areas || '[]'),
            key_behaviors: String(n.key_behaviors || '[]'),
            info_sharing: normalizeNumber(n.info_sharing as string),
            decision_making: normalizeNumber(n.decision_making as string),
            time_management: normalizeNumber(n.time_management as string),
            pm_client_match_score: normalizeNumber(n.pm_client_match_score as string),
            pm_client_assessment: String(n.pm_client_assessment || ''),
            pm_client_strengths: String(n.pm_client_strengths || '[]'),
            pm_client_gaps: String(n.pm_client_gaps || '[]'),
            pm_client_recommendation: String(n.pm_client_recommendation || ''),
          } as PMScore;
        });
        resolve(rows.filter((r) => r.meeting_id));
      },
      error: reject,
    });
  });
}

export async function parseCustomerInsightsCSV(file: File): Promise<CustomerInsight[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as Record<string, unknown>[]).map((r) => {
          const n = normalizeHeaders(r);
          return {
            meeting_id: String(n.meeting_id || ''),
            date: String(n.date || ''),
            account_name: String(n.account_name || ''),
            customer_domain: String(n.customer_domain || ''),
            meeting_type: String(n.meeting_type || ''),
            sentiment: (String(n.sentiment || 'neutral')) as CustomerInsight['sentiment'],
            sentiment_score: normalizeNumber(n.sentiment_score as string),
            sentiment_evidence: String(n.sentiment_evidence || ''),
            pain_points: String(n.pain_points || '[]'),
            key_needs: String(n.key_needs || '[]'),
            feature_requests: String(n.feature_requests || '[]'),
            customer_faq: String(n.customer_faq || '[]'),
            satisfaction_signals: String(n.satisfaction_signals || ''),
            frustration_signals: String(n.frustration_signals || ''),
            pm_client_match_score: normalizeNumber(n.pm_client_match_score as string),
            pm_client_assessment: String(n.pm_client_assessment || ''),
            pm_client_strengths: String(n.pm_client_strengths || '[]'),
            pm_client_gaps: String(n.pm_client_gaps || '[]'),
            pm_client_recommendation: String(n.pm_client_recommendation || ''),
          } as CustomerInsight;
        });
        resolve(rows.filter((r) => r.meeting_id));
      },
      error: reject,
    });
  });
}

export async function parseRiskSignalsCSV(file: File): Promise<RiskSignal[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as Record<string, unknown>[]).map((r) => {
          const n = normalizeHeaders(r);
          return {
            meeting_id: String(n.meeting_id || ''),
            date: String(n.date || ''),
            account_name: String(n.account_name || ''),
            customer_domain: String(n.customer_domain || ''),
            meeting_type: String(n.meeting_type || ''),
            churn_risk: (String(n.churn_risk || 'none')) as RiskSignal['churn_risk'],
            churn_evidence: String(n.churn_evidence || ''),
            churn_indicators: String(n.churn_indicators || '[]'),
            escalation_risk: (String(n.escalation_risk || 'none')) as RiskSignal['escalation_risk'],
            escalation_evidence: String(n.escalation_evidence || ''),
            escalation_triggers: String(n.escalation_triggers || '[]'),
            risk_keywords: String(n.risk_keywords || ''),
            upsell: String(n.upsell || '[]'),
            crosssell: String(n.crosssell || '[]'),
          } as RiskSignal;
        });
        resolve(rows.filter((r) => r.meeting_id));
      },
      error: reject,
    });
  });
}

export async function parseKnowledgeManagementCSV(file: File): Promise<KnowledgeItem[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as Record<string, unknown>[]).map((r) => {
          const n = normalizeHeaders(r);
          return {
            meeting_id: String(n.meeting_id || ''),
            date: String(n.date || ''),
            account_name: String(n.account_name || ''),
            meeting_type: String(n.meeting_type || ''),
            topics_trend: String(n.topics_trend || '[]'),
            is_recurring: normalizeBool(n.is_recurring as string),
            recurring_description: String(n.recurring_description || ''),
            recurrence_evidence: String(n.recurrence_evidence || ''),
            root_cause_hint: String(n.root_cause_hint || ''),
            customer_faq_patterns: String(n.customer_faq_patterns || '[]'),
            new_feature_demands: String(n.new_feature_demands || '[]'),
            documentation_gaps: String(n.documentation_gaps || '[]'),
            next_steps: String(n.next_steps || '[]'),
          } as KnowledgeItem;
        });
        resolve(rows.filter((r) => r.meeting_id));
      },
      error: reject,
    });
  });
}

export async function parseSalesPipelineCSV(file: File): Promise<SalesOrderPipeline[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as Record<string, unknown>[]).map((r) => {
          const n = normalizeHeaders(r);
          return {
            record_id: String(n['record_id'] || n['record id'] || ''),
            subject: String(n.subject || ''),
            account_name: String(n['account_name'] || n['account name'] || ''),
            churn_date: String(n['churn_date'] || n['churn date'] || ''),
            churn_reason: String(n['churn_reason'] || n['churn reason'] || ''),
            contract_date: String(n['contract_date'] || n['contract date'] || ''),
            created_by: String(n['created_by'] || n['created by'] || ''),
            created_time: String(n['created_time'] || n['created time'] || ''),
            due_date: String(n['due_date'] || n['due date'] || ''),
            grand_total: normalizeNumber(n['grand_total'] || n['grand total'] as string),
            minimum_limit_unit: normalizeNumber(n['minimum_limit_unit'] || n['minimum limit unit'] as string),
            opportunity_name: String(n['opportunity_name'] || n['opportunity name'] || ''),
            project_manager: String(n['project_manager'] || n['project manager'] || ''),
            sales_order_owner: String(n['sales_order_owner'] || n['sales order owner'] || ''),
            status: String(n.status || ''),
            tenant_name: String(n['tenant_name'] || n['tenant name'] || ''),
          } as SalesOrderPipeline;
        });
        resolve(rows.filter((r) => r.record_id));
      },
      error: reject,
    });
  });
}

export async function parseSalesLiveCSV(file: File): Promise<SalesOrderLive[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as Record<string, unknown>[]).map((r) => {
          const n = normalizeHeaders(r);
          return {
            record_id: String(n['record_id'] || n['record id'] || ''),
            subject: String(n.subject || ''),
            account_name: String(n['account_name'] || n['account name'] || ''),
            committed_live_date: String(n['committed_live_date'] || n['committed live date'] || ''),
            created_by: String(n['created_by'] || n['created by'] || ''),
            created_time: String(n['created_time'] || n['created time'] || ''),
            due_date: String(n['due_date'] || n['due date'] || ''),
            grand_total: normalizeNumber(n['grand_total'] || n['grand total'] as string),
            layout: String(n.layout || ''),
            order_date: String(n['order_date'] || n['order date'] || ''),
            project_manager: String(n['project_manager'] || n['project manager'] || ''),
            sales_order_owner: String(n['sales_order_owner'] || n['sales order owner'] || ''),
            status: String(n.status || ''),
            tenant_name: String(n['tenant_name'] || n['tenant name'] || ''),
          } as SalesOrderLive;
        });
        resolve(rows.filter((r) => r.record_id));
      },
      error: reject,
    });
  });
}

## Verification Checklist
After completing all steps above, verify:
1. `npm run build` has zero TypeScript errors
2. `src/types/meeting.types.ts` exists with all interfaces
3. `src/types/sales.types.ts` exists with both interfaces
4. `src/store/dataStore.ts` exports `useDataStore`
5. `src/lib/meeting-parsers.ts` exports all functions
6. `src/lib/csv-parser.ts` has new parse functions added WITHOUT removing existing ones
7. No existing files were modified except csv-parser.ts (addition only)

## Progress Log — Fill after completion
- Date completed: ___
- TypeScript errors: ___
- Notes: ___
```

---

## ⚠️ Kullanıcı Etkileşimi Gerekmiyor

Bu iterasyon tamamen kod/altyapı — kullanıcı onayı gerekmez.
Bir sonraki iterasyona geçmeden önce `npm run build` başarılı olmalı.
