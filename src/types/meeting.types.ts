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
