import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { Tenant } from '../types/tenant';
import { 
  X, ChevronLeft, ShieldAlert, Star, FileText, Zap, AlertTriangle, 
  Calendar, Clock, CheckCircle, TrendingUp, ExternalLink, User
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

interface CustomerDetailProps {
  customer: Customer | null;
  onClose: () => void;
}

type TabType = 'Overview' | 'Tickets' | 'Notes' | 'Onboarding';

export const CustomerDetail: React.FC<CustomerDetailProps> = ({ customer, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  useEffect(() => {
    if (customer) {
      fetchTenants();
    }
  }, [customer]);

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

  const ticketTrendData = customer.zohoStats.ticketTrend.map((count, i) => ({
    day: `Day ${i+1}`,
    tickets: count
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

  const hasTechIssues = customer.active?.techIssues && customer.active.techIssues.length > 0;

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
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    customer.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                    customer.status === 'Onboarding' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    'bg-red-100 text-red-700 border-red-200'
                  }`}>
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
                    Contract: {customer.contractEndDate}
                  </span>
                </div>
             </div>
             
             {/* Health Score Badge (Orange style from screenshot) */}
             <div className="bg-amber-500 text-white rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] shadow-lg shadow-amber-500/20">
                <span className="text-4xl font-bold">{customer.active?.healthScore || 0}</span>
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
               <div className={`text-3xl font-bold ${getChurnColor(customer.active?.churnProbability || 0)}`}>
                 {customer.active?.churnProbability || 0}%
               </div>
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
                 {customer.active?.satisfactionScore || 0}/10
               </div>
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Star size={48} />
               </div>
            </div>

            {/* Open Tickets */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-medium">
                 <FileText size={16} /> Open Tickets
               </div>
               <div className={`text-3xl font-bold ${customer.zohoStats.openTickets > 3 ? 'text-red-500' : 'text-emerald-500'}`}>
                 {customer.zohoStats.openTickets}
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
               <div className={`text-3xl font-bold ${getSlaColor(customer.zohoStats.slaScore)}`}>
                 {customer.zohoStats.slaScore}%
               </div>
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Zap size={48} />
               </div>
            </div>
          </div>

          {/* Technical Issues Panel */}
          {hasTechIssues ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="text-amber-800 font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle size={18} /> Technical Issues
              </h3>
              <div className="flex flex-wrap gap-2">
                {customer.active?.techIssues.map((issue, idx) => (
                  <span key={idx} className="bg-amber-100 text-amber-800 text-sm font-medium px-3 py-1.5 rounded-lg border border-amber-200">
                    {issue}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="text-emerald-500" size={20} />
              <span className="text-emerald-800 font-medium">No active technical issues reported.</span>
            </div>
          )}

          {/* Tabs Navigation */}
          <div>
            <div className="flex gap-2 border-b border-slate-200 mb-6">
              {['Overview', 'Tickets', 'Notes', 'Onboarding'].map((tab) => (
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
              
              {/* TAB: ONBOARDING */}
              {activeTab === 'Onboarding' && customer.onboarding && (
                <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Onboarding Status</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Start Date</p>
                      <p className="text-lg font-semibold">{customer.onboarding.startDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Est. End Date</p>
                      <p className="text-lg font-semibold">{customer.onboarding.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Actual End Date</p>
                      <p className={`text-lg font-semibold ${customer.onboarding.actualEndDate ? 'text-white' : 'text-slate-500'}`}>
                        {customer.onboarding.actualEndDate || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Stage</p>
                      <p className="text-lg font-semibold text-blue-400">{customer.onboarding.stage}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                       <span className="text-slate-400">Progress</span>
                       <span className="text-emerald-400 font-bold">{customer.onboarding.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div 
                        className="bg-emerald-500 h-3 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                        style={{ width: `${customer.onboarding.progress}%` }}
                      />
                    </div>
                  </div>

                  {customer.onboarding.bottleneck && (
                    <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm font-medium flex items-center gap-2">
                        <AlertTriangle size={16} /> Bottleneck: {customer.onboarding.bottleneck}
                      </p>
                    </div>
                  )}
                </div>
              )}

               {/* TAB: ONBOARDING (Empty State) */}
               {activeTab === 'Onboarding' && !customer.onboarding && (
                 <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                   <p className="text-slate-400">No onboarding data available for this customer.</p>
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
                        <p className="text-xl font-bold text-slate-800">{customer.zohoStats.avgResponseTimeHours} hours</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-500">Avg Resolution Time</p>
                        <p className="text-xl font-bold text-slate-800">{customer.zohoStats.avgResolutionTimeDays} days</p>
                      </div>
                   </div>
                </div>
              )}

              {/* TAB: NOTES */}
              {activeTab === 'Notes' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                         <FileText size={20} />
                      </div>
                      <div className="space-y-2">
                         <h4 className="font-semibold text-slate-800">Latest Account Note</h4>
                         <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                           {customer.notes}
                         </p>
                         <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
                           <span className="flex items-center gap-1"><Clock size={12}/> Last Interaction: {customer.lastTouchDate}</span>
                           <span>Manager: {customer.accountManager}</span>
                         </div>
                      </div>
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
                           <span className={`font-medium ${(customer.active?.healthScore || 0) > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                             {customer.active?.healthScore}/100
                           </span>
                         </li>
                         <li className="flex justify-between py-2 border-b border-slate-50">
                           <span className="text-slate-500">Renewal Date</span>
                           <span className="font-medium">{customer.contractEndDate}</span>
                         </li>
                       </ul>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                       <h4 className="font-semibold text-slate-800 mb-4">Engagement</h4>
                       <div className="flex flex-col items-center justify-center h-32 text-center space-y-2">
                          <div className={`p-3 rounded-full ${customer.touchedThisWeek ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                             {customer.touchedThisWeek ? <CheckCircle size={32} /> : <Clock size={32} />}
                          </div>
                          <p className="font-medium text-slate-800">
                            {customer.touchedThisWeek ? 'Contacted this week' : 'No contact this week'}
                          </p>
                       </div>
                    </div>
                 </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
