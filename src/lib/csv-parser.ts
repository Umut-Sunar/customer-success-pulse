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
            grand_total: normalizeNumber((n['grand_total'] || n['grand total']) as string),
            minimum_limit_unit: normalizeNumber((n['minimum_limit_unit'] || n['minimum limit unit']) as string),
            opportunity_name: String(n['opportunity_name'] || n['opportunity name'] || ''),
            project_manager: String(n['project_manager'] || n['project manager'] || ''),
            sales_order_owner: String(n['sales_order_owner'] || n['sales order owner'] || ''),
            status: String(n.status || ''),
            tenant_name: String(n['tenant_name'] || n['tenant name'] || ''),
            last_status_comment: String(
              n['last_status_comment'] ||
                n['last status comment'] ||
                n['son_durum'] ||
                n['son durum'] ||
                n['comment'] ||
                ''
            ),
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
            grand_total: normalizeNumber((n['grand_total'] || n['grand total']) as string),
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
