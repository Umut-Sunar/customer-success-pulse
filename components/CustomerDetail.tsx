import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import type { ZohoDeskStats } from '../types';
import { Tenant } from '../types/tenant';
import type { EnrichedCustomer } from '../hooks/useEnrichedCustomers';
import type { CustomerNote, CustomerWithOnboarding } from '../src/types/customer.types';
import { 
  X, ChevronLeft, ShieldAlert, Star, FileText, Zap, AlertTriangle, 
  Calendar, Clock, CheckCircle, TrendingUp, ExternalLink, User, Brain, MessageSquare
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { useDataStore } from '../src/store/dataStore';
import { EmptyState } from '../src/components/shared/EmptyState';
import { parsePainPoints, parseUpsellOpportunities } from '../src/lib/meeting-parsers';

interface CustomerDetailProps {
  customer: EnrichedCustomer | null;
  onClose: () => void;
}

type TabType = 'Overview' | 'Tickets' | 'Notes' | 'Onboarding' | 'Meeting Intel';

/** Placeholder until Zoho integration (Iteration 6) */
const DEFAULT_ZOHO: ZohoDeskStats = {
  openTickets: 0,
  avgResponseTimeHours: 0,
  avgResolutionTimeDays: 0,
  slaScore: 0,
  slaBreached: false,
  lastTicketDate: '—',
  ticketTrend: [0, 0, 0, 0, 0, 0, 0],
};

function sentimentToScoreLabel(sentiment: string | null): string {
  if (!sentiment) return '—';
  const map: Record<string, string> = {
    positive: '9/10',
    neutral: '5/10',
    mixed: '4/10',
    negative: '2/10',
  };
  return map[sentiment] ?? '—';
}

function churnRiskToPercent(risk: 'none' | 'low' | 'medium' | 'high'): number {
  switch (risk) {
    case 'high':
      return 85;
    case 'medium':
      return 55;
    case 'low':
      return 25;
    default:
      return 10;
  }
}

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString();
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({ customer, onClose }) => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  const [onboardingRecord, setOnboardingRecord] = useState<CustomerWithOnboarding | null>(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [formStage, setFormStage] = useState('Requirements');
  const [formGoLive, setFormGoLive] = useState('');
  const [formCommitted, setFormCommitted] = useState('');
  const [formBottleneck, setFormBottleneck] = useState('');
  const [formProgress, setFormProgress] = useState(0);
  const [formNotes, setFormNotes] = useState('');

  const [notesList, setNotesList] = useState<CustomerNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (customer) {
      fetchTenants();
    }
  }, [customer]);

  useEffect(() => {
    if (!customer || activeTab !== 'Onboarding') return;
    setLoadingOnboarding(true);
    fetch(`/api/customers/${customer.id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load customer');
        return r.json();
      })
      .then((data: CustomerWithOnboarding) => {
        setOnboardingRecord(data);
        const od = data.onboarding;
        setFormStage(od?.stage ?? 'Requirements');
        setFormGoLive(od?.go_live_date ? String(od.go_live_date).slice(0, 10) : '');
        setFormCommitted(od?.committed_live_date ? String(od.committed_live_date).slice(0, 10) : '');
        setFormBottleneck(od?.bottleneck ?? '');
        setFormProgress(od?.progress ?? 0);
        setFormNotes(od?.notes ?? '');
      })
      .catch(() => {
        setOnboardingRecord({ ...customer, onboarding: undefined } as CustomerWithOnboarding);
        setFormStage('Requirements');
        setFormGoLive('');
        setFormCommitted('');
        setFormBottleneck('');
        setFormProgress(0);
        setFormNotes('');
      })
      .finally(() => setLoadingOnboarding(false));
  }, [customer?.id, activeTab]);

  useEffect(() => {
    if (!customer || activeTab !== 'Notes') return;
    setNotesLoading(true);
    fetch(`/api/customers/${customer.id}/notes`)
      .then((r) => r.json())
      .then((data: CustomerNote[]) => setNotesList(Array.isArray(data) ? data : []))
      .catch(() => setNotesList([]))
      .finally(() => setNotesLoading(false));
  }, [customer?.id, activeTab]);

  const fetchTenants = async () => {
    if (!customer) return;
    
    setLoadingTenants(true);
    try {
      const url = new URL('/api/customers/' + customer.id + '/tenants', window.location.origin);
      url.searchParams.set('name', customer.name);
      url.searchParams.set('domain', customer.domain);
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const data: Tenant[] = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoadingTenants(false);
    }
  };

  if (!customer) return null;

  const saveOnboarding = async () => {
    setSavingOnboarding(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: formStage,
          go_live_date: formGoLive || null,
          committed_live_date: formCommitted || null,
          bottleneck: formBottleneck.trim() || null,
          progress: Math.min(100, Math.max(0, Number(formProgress) || 0)),
          notes: formNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const refreshed = await fetch(`/api/customers/${customer.id}`).then((r) => r.json());
      setOnboardingRecord(refreshed as CustomerWithOnboarding);
      const od = (refreshed as CustomerWithOnboarding).onboarding;
      setFormStage(od?.stage ?? 'Requirements');
      setFormGoLive(od?.go_live_date ? String(od.go_live_date).slice(0, 10) : '');
      setFormCommitted(od?.committed_live_date ? String(od.committed_live_date).slice(0, 10) : '');
      setFormBottleneck(od?.bottleneck ?? '');
      setFormProgress(od?.progress ?? 0);
      setFormNotes(od?.notes ?? '');
    } catch (e) {
      console.error(e);
    } finally {
      setSavingOnboarding(false);
    }
  };

  const handleAddNote = async () => {
    const content = newNoteText.trim();
    if (!content) return;
    const author = user?.primaryEmailAddress?.emailAddress ?? null;
    const tempId = -Date.now();
    const optimistic: CustomerNote = {
      id: tempId,
      customer_id: customer.id,
      content,
      author,
      created_at: new Date().toISOString(),
    };
    setNotesList((prev) => [optimistic, ...prev]);
    setNewNoteText('');
    setSavingNote(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, author }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      const created = (await res.json()) as CustomerNote;
      setNotesList((prev) => prev.map((n) => (n.id === tempId ? created : n)));
    } catch (e) {
      console.error(e);
      setNotesList((prev) => prev.filter((n) => n.id !== tempId));
      setNewNoteText(content);
    } finally {
      setSavingNote(false);
    }
  };

  const zohoStats = DEFAULT_ZOHO;
  const ticketTrendData = zohoStats.ticketTrend.map((count, i) => ({
    day: `Day ${i + 1}`,
    tickets: count,
  }));

  // Helper to determine color based on metrics
  const getSlaColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 75) return 'text-amber-500';
    return 'text-red-500';
  };

  const getChurnColor = (prob: number) => {
    if (prob <= 20) return 'text-emerald-500';
    if (prob <= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const hasEscalationConcern =
    customer.escalation_risk === 'high' || customer.escalation_risk === 'medium';

  // Meeting Intel tab: match by customer.name or customer.domain to account_name / customer_domain
  const customerInsights = useDataStore((s) => s.customerInsights);
  const riskSignals = useDataStore((s) => s.riskSignals);
  const meetings = useDataStore((s) => s.meetings);
  const pmScores = useDataStore((s) => s.pmScores);

  const meetingIntelData = useMemo(() => {
    const n = customer.name.toLowerCase();
    const d = customer.domain?.toLowerCase() ?? '';
    const match = (ci: { account_name?: string; customer_domain?: string }) => {
      const an = ci.account_name?.toLowerCase() ?? '';
      const dom = ci.customer_domain?.toLowerCase() ?? '';
      return (
        (an && (an.includes(n) || n.includes(an))) ||
        (!!d && dom && dom.includes(d))
      );
    };
    const insights = customerInsights.filter(match);
    if (insights.length === 0) return null;
    const sortedInsights = [...insights].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const latestInsight = sortedInsights[0];
    const customerMeetings = meetings
      .filter((m) => match(m))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 3);
    const customerMeetingIds = new Set(meetings.filter((m) => match(m)).map((m) => m.meeting_id));
    const allPainPoints = insights.flatMap((i) => parsePainPoints(i.pain_points));
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const topPainPoints = [...allPainPoints]
      .sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3))
      .slice(0, 3);
    const accountRiskSignals = riskSignals.filter((r) => match(r));
    const upsellOpps = accountRiskSignals.flatMap((r) => parseUpsellOpportunities(r.upsell));
    const customerPmScores = pmScores.filter((p) => customerMeetingIds.has(p.meeting_id));
    const latestPmScore = customerPmScores.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    return {
      latestInsight,
      customerMeetings,
      topPainPoints,
      upsellOpps,
      latestPmScore,
    };
  }, [customer.name, customer.domain, customerInsights, meetings, riskSignals, pmScores]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Slide-over Panel */}
      <div className="relative w-full max-w-4xl bg-white shadow-2xl h-full overflow-y-auto transform transition-transform animate-in slide-in-from-right duration-300 flex flex-col">
        
        {/* Top Header Navigation */}
        <div className="pt-6 px-8 pb-2 flex justify-between items-center">
          <button 
            onClick={onClose}
            className="flex items-center text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium"
          >
            <ChevronLeft size={18} className="mr-1" />
            Back to List
          </button>
        </div>

        {/* Header Information */}
        <div className="px-8 pb-6 border-b border-slate-100">
           <div className="flex justify-between items-start">
             <div className="flex-1">
                <h2 className="text-3xl font-bold text-slate-800">{customer.name}</h2>
                
                {/* Tenant Information */}
                {tenants.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {tenants.map((tenant, idx) => (
                      <div key={tenant.id} className="flex items-center gap-2 flex-wrap">
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            // You can add navigation or modal here
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                        >
                          {tenant.tenant_name}
                        </a>
                        {tenant.tenant_owner && (
                          <>
                            <span className="text-xs text-slate-400">•</span>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <User size={12} />
                              <span>Tenant Owner: {tenant.tenant_owner}</span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {loadingTenants && (
                  <div className="mt-2 text-xs text-slate-400">Loading tenant information...</div>
                )}
                
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      customer.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : customer.status === 'Onboarding'
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : customer.status === 'Churned'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-red-100 text-red-700 border-red-200'
                    }`}
                  >
                    {customer.status}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                    {customer.segment}
                  </span>
                  <span className="text-sm text-slate-500 font-medium">
                    ${customer.mrr.toLocaleString()}/mo MRR
                  </span>
                  <span className="text-sm text-slate-400">•</span>
                  <span className="text-sm text-slate-500">
                    Contract end: {customer.contract_end ?? '—'}
                  </span>
                </div>
             </div>
             
             {/* Health Score Badge (Orange style from screenshot) */}
             <div className="bg-amber-500 text-white rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] shadow-lg shadow-amber-500/20">
                <span className="text-4xl font-bold">{customer.health_score ?? 0}</span>
                <span className="text-xs font-bold uppercase tracking-wider opacity-90">Score</span>
             </div>
           </div>
        </div>

        <div className="p-8 space-y-8 flex-1 bg-slate-50/50">
          
          {/* Metrics Grid (4 Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Churn Risk */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-medium">
                 <ShieldAlert size={16} /> Churn Risk
               </div>
               <div className={`text-3xl font-bold ${getChurnColor(churnRiskToPercent(customer.churn_risk ?? 'none'))}`}>
                 {String(customer.churn_risk ?? 'none').toUpperCase()}
               </div>
               <p className="text-xs text-slate-400 mt-1">Signal from latest meeting</p>
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ShieldAlert size={48} />
               </div>
            </div>

            {/* Satisfaction */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-medium">
                 <Star size={16} /> Satisfaction
               </div>
               <div className="text-3xl font-bold text-emerald-500">
                 {sentimentToScoreLabel(customer.last_sentiment ?? null)}
               </div>
               <p className="text-xs text-slate-400 mt-1">
                 From last sentiment: {customer.last_sentiment ?? '—'}
               </p>
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Star size={48} />
               </div>
            </div>

            {/* Open Tickets */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-medium">
                 <FileText size={16} /> Open Tickets
               </div>
               <div className={`text-3xl font-bold ${zohoStats.openTickets > 3 ? 'text-red-500' : 'text-emerald-500'}`}>
                 {zohoStats.openTickets}
               </div>
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <FileText size={48} />
               </div>
            </div>

             {/* SLA Compliance */}
             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-medium">
                 <Zap size={16} /> SLA Score
               </div>
               <div className={`text-3xl font-bold ${getSlaColor(zohoStats.slaScore)}`}>
                 {zohoStats.slaScore}%
               </div>
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Zap size={48} />
               </div>
            </div>
          </div>

          {/* Escalation / risk callout (computed from CSV) */}
          {hasEscalationConcern ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="text-amber-800 font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle size={18} /> Escalation signal
              </h3>
              <p className="text-sm text-amber-900">
                Latest escalation risk: <strong>{customer.escalation_risk}</strong>
              </p>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="text-emerald-500" size={20} />
              <span className="text-emerald-800 font-medium">No active escalation signals in meeting data.</span>
            </div>
          )}

          {/* Tabs Navigation */}
          <div>
            <div className="flex gap-2 border-b border-slate-200 mb-6">
              {['Overview', 'Tickets', 'Notes', 'Onboarding', 'Meeting Intel'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as TabType)}
                  className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab 
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content Areas */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* TAB: ONBOARDING — DB + PUT /api/customers/[id]/onboarding */}
              {activeTab === 'Onboarding' && (
                <div className="space-y-6">
                  {loadingOnboarding ? (
                    <div className="py-12 text-center text-slate-500 text-sm">Loading onboarding…</div>
                  ) : (
                    <>
                      {!onboardingRecord?.onboarding ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          No onboarding data — add it below and save.
                        </div>
                      ) : (
                        <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg">
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">
                            Onboarding status
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-6">
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-200 border border-blue-400/30">
                              {onboardingRecord.onboarding.stage}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Go-live date</p>
                              <p className="text-lg font-semibold">
                                {onboardingRecord.onboarding.go_live_date ?? '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Committed live date</p>
                              <p className="text-lg font-semibold">
                                {onboardingRecord.onboarding.committed_live_date ?? '—'}
                              </p>
                            </div>
                          </div>
                          <div className="mb-6">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-400">Progress</span>
                              <span className="text-emerald-400 font-bold">
                                {onboardingRecord.onboarding.progress}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-3">
                              <div
                                className="bg-emerald-500 h-3 rounded-full"
                                style={{ width: `${onboardingRecord.onboarding.progress}%` }}
                              />
                            </div>
                          </div>
                          {onboardingRecord.onboarding.bottleneck && (
                            <div className="p-4 bg-red-900/30 border border-red-500/40 rounded-lg">
                              <p className="text-red-300 text-sm font-medium flex items-center gap-2">
                                <AlertTriangle size={16} /> {onboardingRecord.onboarding.bottleneck}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-semibold text-slate-800">Edit onboarding</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="block text-sm">
                            <span className="text-slate-600">Stage</span>
                            <input
                              type="text"
                              value={formStage}
                              onChange={(e) => setFormStage(e.target.value)}
                              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="text-slate-600">Progress (%)</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={formProgress}
                              onChange={(e) => setFormProgress(Number(e.target.value))}
                              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="text-slate-600">Go-live date</span>
                            <input
                              type="date"
                              value={formGoLive}
                              onChange={(e) => setFormGoLive(e.target.value)}
                              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="text-slate-600">Committed live date</span>
                            <input
                              type="date"
                              value={formCommitted}
                              onChange={(e) => setFormCommitted(e.target.value)}
                              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                          </label>
                        </div>
                        <label className="block text-sm">
                          <span className="text-slate-600">Bottleneck</span>
                          <input
                            type="text"
                            value={formBottleneck}
                            onChange={(e) => setFormBottleneck(e.target.value)}
                            placeholder="Optional"
                            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="text-slate-600">Notes</span>
                          <textarea
                            value={formNotes}
                            onChange={(e) => setFormNotes(e.target.value)}
                            rows={4}
                            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={saveOnboarding}
                          disabled={savingOnboarding}
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingOnboarding ? 'Saving…' : 'Save onboarding'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB: TICKETS */}
              {activeTab === 'Tickets' && (
                <div className="space-y-6">
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="font-semibold text-slate-800 mb-4">Ticket Volume Trend (7 Days)</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={ticketTrendData}>
                            <defs>
                              <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Tooltip 
                              contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0'}}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="tickets" 
                              stroke="#3b82f6" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorTickets)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-500">Avg Response Time</p>
                        <p className="text-xl font-bold text-slate-800">{zohoStats.avgResponseTimeHours} hours</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-500">Avg Resolution Time</p>
                        <p className="text-xl font-bold text-slate-800">{zohoStats.avgResolutionTimeDays} days</p>
                      </div>
                   </div>
                </div>
              )}

              {/* TAB: NOTES — GET/POST /api/customers/[id]/notes */}
              {activeTab === 'Notes' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <FileText size={18} /> Account notes
                    </h4>
                    {notesLoading ? (
                      <p className="text-sm text-slate-500 py-8 text-center">Loading notes…</p>
                    ) : notesList.length === 0 ? (
                      <p className="text-sm text-slate-500 py-6 text-center">No notes yet. Add one below.</p>
                    ) : (
                      <ul className="space-y-4">
                        {notesList.map((note) => (
                          <li
                            key={note.id}
                            className="border border-slate-100 rounded-lg p-4 bg-slate-50/80"
                          >
                            <p className="text-slate-800 whitespace-pre-wrap">{note.content}</p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span>{note.author ?? 'Unknown'}</span>
                              <span>·</span>
                              <span>{formatRelativeTime(note.created_at)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-semibold text-slate-800 mb-3">Add note</h4>
                    <textarea
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      rows={4}
                      placeholder="Write a note…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
                    />
                    <button
                      type="button"
                      onClick={handleAddNote}
                      disabled={savingNote || !newNoteText.trim()}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingNote ? 'Saving…' : 'Add note'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: OVERVIEW */}
              {activeTab === 'Overview' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                       <h4 className="font-semibold text-slate-800 mb-4">Account Summary</h4>
                       <ul className="space-y-3">
                         <li className="flex justify-between py-2 border-b border-slate-50">
                           <span className="text-slate-500">Total MRR</span>
                           <span className="font-medium">${customer.mrr.toLocaleString()}</span>
                         </li>
                         <li className="flex justify-between py-2 border-b border-slate-50">
                           <span className="text-slate-500">Health Score</span>
                           <span
                             className={`font-medium ${(customer.health_score ?? 0) > 80 ? 'text-emerald-600' : 'text-amber-600'}`}
                           >
                             {customer.health_score ?? 0}/100
                           </span>
                         </li>
                         <li className="flex justify-between py-2 border-b border-slate-50">
                           <span className="text-slate-500">Contract end</span>
                           <span className="font-medium">{customer.contract_end ?? '—'}</span>
                         </li>
                         <li className="flex justify-between py-2 border-b border-slate-50">
                           <span className="text-slate-500">Churn risk (computed)</span>
                           <span className="font-medium capitalize">{customer.churn_risk ?? 'none'}</span>
                         </li>
                       </ul>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                       <h4 className="font-semibold text-slate-800 mb-4">Engagement</h4>
                       <div className="flex flex-col items-center justify-center h-32 text-center space-y-2">
                          <div
                            className={`p-3 rounded-full ${
                              customer.touch_status === 'Touched'
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-amber-100 text-amber-600'
                            }`}
                          >
                            {customer.touch_status === 'Touched' ? <CheckCircle size={32} /> : <Clock size={32} />}
                          </div>
                          <p className="font-medium text-slate-800">
                            {customer.touch_status === 'Touched'
                              ? 'Touched (meeting in last 14 days)'
                              : 'Untouched (no meeting in last 14 days)'}
                          </p>
                          {customer.last_meeting_date && (
                            <p className="text-xs text-slate-500">Last meeting: {customer.last_meeting_date}</p>
                          )}
                       </div>
                    </div>
                 </div>
              )}

              {/* TAB: MEETING INTEL */}
              {activeTab === 'Meeting Intel' && (
                <>
                  {!meetingIntelData ? (
                    <EmptyState
                      icon={<Brain className="h-12 w-12 text-slate-400" />}
                      title="No meeting data"
                      description="No customer insights found for this account. Match by account name or domain in uploaded Meeting Intelligence data."
                    />
                  ) : (
                    <div className="space-y-6">
                      {/* Last sentiment score + badge */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <MessageSquare size={18} /> Last sentiment
                        </h4>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              meetingIntelData.latestInsight.sentiment === 'positive'
                                ? 'bg-emerald-100 text-emerald-700'
                                : meetingIntelData.latestInsight.sentiment === 'negative'
                                  ? 'bg-red-100 text-red-700'
                                  : meetingIntelData.latestInsight.sentiment === 'mixed'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {meetingIntelData.latestInsight.sentiment}
                          </span>
                          <span className="text-slate-600">
                            Score: <strong>{meetingIntelData.latestInsight.sentiment_score}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Last 3 meetings mini timeline */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <Calendar size={18} /> Recent meetings
                        </h4>
                        {meetingIntelData.customerMeetings.length === 0 ? (
                          <p className="text-sm text-slate-500">No meetings in dataset.</p>
                        ) : (
                          <ul className="space-y-2">
                            {meetingIntelData.customerMeetings.map((m, i) => (
                              <li key={m.meeting_id || i} className="flex items-center gap-3 text-sm">
                                <span className="text-slate-500 shrink-0">{m.date}</span>
                                <span className="text-slate-700">{m.title || m.meeting_type || 'Meeting'}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Pain points (top 3 by severity) */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <AlertTriangle size={18} /> Pain points
                        </h4>
                        {meetingIntelData.topPainPoints.length === 0 ? (
                          <p className="text-sm text-slate-500">None identified.</p>
                        ) : (
                          <ul className="space-y-2">
                            {meetingIntelData.topPainPoints.map((pp, i) => (
                              <li key={i} className="text-sm">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                                    pp.severity === 'high'
                                      ? 'bg-red-100 text-red-700'
                                      : pp.severity === 'medium'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {pp.severity}
                                </span>
                                {pp.issue}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Active upsell opportunities */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <TrendingUp size={18} /> Upsell opportunities
                        </h4>
                        {meetingIntelData.upsellOpps.length === 0 ? (
                          <p className="text-sm text-slate-500">None identified.</p>
                        ) : (
                          <ul className="space-y-2">
                            {meetingIntelData.upsellOpps.slice(0, 5).map((o, i) => (
                              <li key={i} className="text-sm text-slate-700">
                                <span className="font-medium">{o.product}</span>
                                {o.signal && <span className="text-slate-500"> — {o.signal}</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Latest PM feedback */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <User size={18} /> Latest PM feedback
                        </h4>
                        {!meetingIntelData.latestPmScore ? (
                          <p className="text-sm text-slate-500">No PM score data for this account.</p>
                        ) : (
                          <div className="space-y-2 text-sm">
                            {(meetingIntelData.latestPmScore.pm_client_recommendation || meetingIntelData.latestPmScore.feedback) && (
                              <p className="text-slate-700">
                                {meetingIntelData.latestPmScore.pm_client_recommendation || meetingIntelData.latestPmScore.feedback}
                              </p>
                            )}
                            {meetingIntelData.latestPmScore.pm_name && (
                              <p className="text-slate-500 text-xs">
                                — {meetingIntelData.latestPmScore.pm_name}
                                {meetingIntelData.latestPmScore.date && ` (${meetingIntelData.latestPmScore.date})`}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
