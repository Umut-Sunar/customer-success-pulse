import {
  parseMeetingsMasterCSV,
  parsePMScoresCSV,
  parseCustomerInsightsCSV,
  parseRiskSignalsCSV,
  parseKnowledgeManagementCSV,
  parseSalesPipelineCSV,
  parseSalesLiveCSV,
} from './csv-parser';

/**
 * Single source of truth for CSV upload slots in DataUploadModal.
 * Order matches the 7 datasets required for a full dashboard load.
 */
export const UPLOAD_DATASETS = [
  {
    key: 'meetings_master',
    title: 'Meetings Master',
    description: 'Google Sheets export: all meetings (customer + internal).',
    columnHints: 'meeting_id, date, account_name, customer_domain',
    color: 'blue',
    parser: parseMeetingsMasterCSV,
    setterKey: 'setMeetings' as const,
  },
  {
    key: 'pm_scores',
    title: 'PM Scores',
    description: 'Project manager performance scores from Sheets.',
    columnHints: 'pm_name, score, period',
    color: 'purple',
    parser: parsePMScoresCSV,
    setterKey: 'setPmScores' as const,
  },
  {
    key: 'customer_insights',
    title: 'Customer Insights',
    description: 'Per-account insights and themes from Sheets.',
    columnHints: 'account_name, insight, sentiment',
    color: 'green',
    parser: parseCustomerInsightsCSV,
    setterKey: 'setCustomerInsights' as const,
  },
  {
    key: 'risk_signals',
    title: 'Risk Signals',
    description: 'Risk and churn signals export.',
    columnHints: 'account_name, signal, severity',
    color: 'red',
    parser: parseRiskSignalsCSV,
    setterKey: 'setRiskSignals' as const,
  },
  {
    key: 'knowledge_management',
    title: 'Knowledge Base',
    description: 'Knowledge articles / FAQ export.',
    columnHints: 'title, topic, owner',
    color: 'orange',
    parser: parseKnowledgeManagementCSV,
    setterKey: 'setKnowledgeItems' as const,
  },
  {
    key: 'sales_pipeline',
    title: 'Sales Pipeline (Setup / Hold)',
    description: 'Zoho CRM pipeline CSV (setup, hold, stages).',
    columnHints: 'Deal_Name, Stage, Amount',
    color: 'yellow',
    parser: parseSalesPipelineCSV,
    setterKey: 'setPipelineOrders' as const,
  },
  {
    key: 'sales_live',
    title: 'Sales Live Orders',
    description: 'Zoho live / committed orders (MRR, go-live dates).',
    columnHints: 'Account_Name, Grand_Total, Due_Date',
    color: 'teal',
    parser: parseSalesLiveCSV,
    setterKey: 'setLiveOrders' as const,
  },
] as const;

export type UploadDatasetKey = (typeof UPLOAD_DATASETS)[number]['key'];

export type UploadDatasetRow = (typeof UPLOAD_DATASETS)[number];

export const BORDER_COLORS: Record<string, string> = {
  blue: 'border-blue-400 bg-blue-50',
  purple: 'border-purple-400 bg-purple-50',
  green: 'border-green-400 bg-green-50',
  red: 'border-red-400 bg-red-50',
  orange: 'border-orange-400 bg-orange-50',
  yellow: 'border-yellow-400 bg-yellow-50',
  teal: 'border-teal-400 bg-teal-50',
  slate: 'border-slate-400 bg-slate-50',
};

export function getUploadDatasetMeta(key: string): {
  key: string;
  datasetId: string;
  title: string;
  description: string;
  columnHints: string;
  color: UploadDatasetRow['color'] | 'slate';
} {
  const row = UPLOAD_DATASETS.find((d) => d.key === key);
  if (row) {
    return {
      key: row.key,
      datasetId: row.key,
      title: row.title,
      description: row.description,
      columnHints: row.columnHints,
      color: row.color,
    };
  }
  return {
    key: 'unknown',
    datasetId: 'unknown',
    title: 'Unknown dataset',
    description: 'This upload slot is not recognized.',
    columnHints: '',
    color: 'slate',
  };
}
