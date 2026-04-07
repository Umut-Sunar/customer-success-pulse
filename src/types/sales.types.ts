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
  /** Son durum notu — CSV veya Düzenle modalı; IndexedDB’de kalır. */
  last_status_comment: string;
}

export interface SalesOrderLive {
  record_id: string;
  subject: string;
  account_name: string;
  /** CSV: committed live date (Zoho). UI’da Live Date için `getSalesLiveDisplayDate` kullan. */
  committed_live_date: string;
  created_by: string;
  created_time: string;
  /** CSV: Due Date — boş committed_live_date ise Live Date sütununda gösterilir. */
  due_date: string;
  grand_total: number;
  layout: string;
  order_date: string;
  project_manager: string;
  sales_order_owner: string;
  status: string;
  tenant_name: string;
}
