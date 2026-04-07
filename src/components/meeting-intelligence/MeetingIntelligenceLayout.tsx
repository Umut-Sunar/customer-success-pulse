import { useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { EmptyState } from '../shared/EmptyState';
import { MeetingOverview } from './MeetingOverview';
import { PMPerformance } from './PMPerformance';
import { CustomerIntelligence } from './CustomerIntelligence';
import { RiskDashboard } from './RiskDashboard';
import { KnowledgeBase } from './KnowledgeBase';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pm', label: 'PM Performance' },
  { id: 'customer', label: 'Customer Intel' },
  { id: 'risk', label: 'Risk & Churn' },
  { id: 'knowledge', label: 'Knowledge Base' },
] as const;

export type MeetingIntelTabId = (typeof TABS)[number]['id'];

export interface MeetingIntelligenceLayoutProps {
  onOpenUploadModal?: () => void;
  selectedTab?: MeetingIntelTabId;
  onTabChange?: (tab: MeetingIntelTabId) => void;
}

export function MeetingIntelligenceLayout({
  onOpenUploadModal,
  selectedTab: controlledTab,
  onTabChange,
}: MeetingIntelligenceLayoutProps) {
  const meetings = useDataStore((s) => s.meetings);
  const isParsingMeetings = useDataStore((s) => s.isParsingMeetings);
  const [internalTab, setInternalTab] = useState<MeetingIntelTabId>('overview');
  const activeTab = onTabChange && controlledTab !== undefined ? controlledTab : internalTab;
  const setActiveTab = onTabChange && controlledTab !== undefined ? onTabChange : setInternalTab;
  const [drawerAccount, setDrawerAccount] = useState<{ account_name: string; customer_domain: string } | null>(null);

  if (meetings.length === 0 && !isParsingMeetings) {
    return (
      <EmptyState
        title="No meeting data yet"
        description="Upload your Google Sheets CSV exports to see meeting intelligence, PM performance, and customer insights."
        action={
          onOpenUploadModal ? (
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Upload Data Files
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto min-w-0 w-full">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {activeTab === 'overview' && <MeetingOverview />}
        {activeTab === 'pm' && <PMPerformance />}
        {activeTab === 'customer' && (
          <CustomerIntelligence
            drawerAccount={drawerAccount}
            onOpenDrawer={setDrawerAccount}
            onCloseDrawer={() => setDrawerAccount(null)}
          />
        )}
        {activeTab === 'risk' && (
          <RiskDashboard
            onViewAccountDetails={(account) => {
              setDrawerAccount(account);
              setActiveTab('customer');
            }}
          />
        )}
        {activeTab === 'knowledge' && <KnowledgeBase />}
      </div>
    </div>
  );
}
