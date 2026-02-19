import React from 'react';
import { Customer } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { AlertTriangle, TrendingUp, CheckCircle2, Clock, Plane, Calendar, MapPin, Box, CheckCircle } from 'lucide-react';

interface DashboardOverviewProps {
  customers: Customer[];
}

const COLORS = {
  Onboarding: '#3b82f6', // blue-500
  Active: '#10b981',     // emerald-500
  AtRisk: '#ef4444',     // red-500
  Churned: '#64748b',    // slate-500
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ customers }) => {
  // 1. Calculate Touch Status (Count)
  const touchedCount = customers.filter(c => c.touchedThisWeek).length;
  const untouchedCount = customers.length - touchedCount;
  const touchRateCount = Math.round((touchedCount / customers.length) * 100);

  // MRR based Touch Rate
  const totalMRR = customers.reduce((acc, c) => acc + c.mrr, 0);
  const touchedMRR = customers
    .filter(c => c.touchedThisWeek)
    .reduce((acc, c) => acc + c.mrr, 0);
  const touchRateMRR = totalMRR > 0 ? Math.round((touchedMRR / totalMRR) * 100) : 0;
  
  const touchData = [
    { name: 'Touched', value: touchedCount, fill: '#10b981' },
    { name: 'Untouched', value: untouchedCount, fill: '#f59e0b' },
  ];

  // 2. Calculate Health/Status Distribution
  const statusCounts = customers.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const healthData = Object.keys(statusCounts).map(key => ({
    name: key,
    value: statusCounts[key],
  }));

  // 3. Urgent Actions (Bottlenecks or High Risk)
  const urgentActions = customers.filter(c => 
    (c.status === 'Onboarding' && c.onboarding?.bottleneck) || 
    (c.status === 'At Risk')
  );

  // 4. Onboarding Specific List & Calculations
  const onboardingCustomers = customers.filter(c => c.status === 'Onboarding');
  const totalOnboardingMRR = onboardingCustomers.reduce((acc, c) => acc + c.mrr, 0);

  // 5. Historical Go-Lives (Completed Onboarding)
  // Filter for customers who are NOT currently onboarding but have an actualEndDate
  const pastImplementations = customers.filter(c => 
    c.status !== 'Onboarding' && 
    c.onboarding?.actualEndDate
  );

  // Group by Month (YYYY-MM)
  const historyByMonth = pastImplementations.reduce((acc, c) => {
    if (!c.onboarding?.actualEndDate) return acc;
    // Extract YYYY-MM
    const date = new Date(c.onboarding.actualEndDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        label: monthName,
        totalMRR: 0,
        customers: []
      };
    }
    
    acc[monthKey].totalMRR += c.mrr;
    acc[monthKey].customers.push(c);
    return acc;
  }, {} as Record<string, { label: string; totalMRR: number; customers: Customer[] }>);

  // Sort months descending
  const sortedHistoryKeys = Object.keys(historyByMonth).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total MRR</p>
            <p className="text-2xl font-bold text-slate-800">
              ${totalMRR.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
           <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500 mb-1">Touch Rate</p>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xl font-bold text-slate-800">{touchRateMRR}%</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">MRR</p>
                </div>
                <div className="h-8 w-px bg-slate-100 mx-2"></div>
                <div>
                     <p className="text-xl font-bold text-slate-700">{touchRateCount}%</p>
                     <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Count</p>
                </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
           <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Onboarding</p>
            <p className="text-2xl font-bold text-slate-800">
              {customers.filter(c => c.status === 'Onboarding').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
           <div className="p-3 bg-red-50 text-red-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">At Risk</p>
            <p className="text-2xl font-bold text-slate-800">
              {customers.filter(c => c.status === 'At Risk').length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Touch Status Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Weekly Touch Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={touchData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" barSize={30} radius={[0, 4, 4, 0]}>
                  {touchData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Health Overview Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Account Health Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {healthData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'At Risk' ? COLORS.AtRisk : entry.name === 'Onboarding' ? COLORS.Onboarding : COLORS.Active} 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Urgent Actions List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20}/> Urgent Actions
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {urgentActions.length === 0 ? (
               <div className="text-center text-slate-400 py-10">No urgent actions required. Good job!</div>
            ) : (
              urgentActions.map(customer => (
                <div key={customer.id} className="p-3 border-l-4 border-red-500 bg-red-50 rounded-r-md">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-slate-800">{customer.name}</span>
                    <span className="text-xs font-bold text-red-600 uppercase bg-red-100 px-2 py-0.5 rounded">
                      {customer.status === 'Onboarding' ? 'Bottleneck' : 'Churn Risk'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {customer.status === 'Onboarding' ? customer.onboarding?.bottleneck : customer.active?.techIssues[0] || 'High dissatisfaction score'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Onboarding Pipeline Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
             <Plane className="text-blue-600" size={20} /> Onboarding Pipeline
          </h3>
          
          <div className="flex items-center bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-100 shadow-sm">
             <span className="text-xs font-bold uppercase tracking-wider mr-2 text-blue-500">Total Pipeline Value</span>
             <span className="text-lg font-bold">${totalOnboardingMRR.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto mb-8">
           <table className="w-full text-left">
             <thead>
               <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                 <th className="pb-3 pl-2">Client</th>
                 <th className="pb-3">Route (Origin &rarr; Dest)</th>
                 <th className="pb-3">Products Used</th>
                 <th className="pb-3">Timeline</th>
                 <th className="pb-3">Progress</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {onboardingCustomers.map(customer => (
                 <tr key={customer.id} className="group hover:bg-slate-50 transition-colors">
                   <td className="py-4 pl-2">
                     <div className="font-medium text-slate-800">{customer.name}</div>
                     <div className="text-sm text-slate-500 font-medium">${customer.mrr.toLocaleString()} MRR</div>
                   </td>
                   <td className="py-4">
                     <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                           <span className="text-xs font-bold text-slate-400 uppercase">From</span>
                           <span className="font-bold text-slate-700">{customer.originCountry || 'N/A'}</span>
                        </div>
                        <div className="h-0.5 w-6 bg-slate-300"></div>
                        <div className="flex flex-col items-center">
                           <span className="text-xs font-bold text-slate-400 uppercase">To</span>
                           <span className="font-bold text-slate-700">{customer.destinationCountry || 'N/A'}</span>
                        </div>
                     </div>
                   </td>
                   <td className="py-4">
                     <div className="flex flex-wrap gap-1.5">
                       {customer.products.map((prod, idx) => (
                         <span key={idx} className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                           <Box size={10} /> {prod}
                         </span>
                       ))}
                     </div>
                   </td>
                   <td className="py-4">
                      <div className="text-sm text-slate-600 flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar size={12}/> Start: {customer.onboarding?.startDate}</span>
                        <span className="flex items-center gap-1 font-medium text-blue-600"><Clock size={12}/> Due: {customer.onboarding?.dueDate}</span>
                      </div>
                   </td>
                   <td className="py-4 w-48 align-middle">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">{customer.onboarding?.stage}</span>
                        <span className="font-bold text-slate-700">{customer.onboarding?.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{width: `${customer.onboarding?.progress}%`}}
                        />
                      </div>
                      {customer.onboarding?.bottleneck && (
                        <div className="mt-1 text-[10px] text-red-500 font-medium flex items-center gap-1">
                           <AlertTriangle size={10} /> Bottleneck
                        </div>
                      )}
                   </td>
                 </tr>
               ))}
               {onboardingCustomers.length === 0 && (
                 <tr>
                   <td colSpan={5} className="py-8 text-center text-slate-400">
                     No customers currently in onboarding.
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
        </div>

        {/* Historical Implementations Section */}
        {sortedHistoryKeys.length > 0 && (
          <div className="border-t border-slate-100 pt-8">
            <h4 className="text-md font-bold text-slate-800 mb-5 flex items-center gap-2">
              <CheckCircle className="text-emerald-500" size={20} />
              Monthly Implementation History (Go-Lives)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedHistoryKeys.map((monthKey) => {
                const data = historyByMonth[monthKey];
                return (
                  <div key={monthKey} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
                      <span className="font-semibold text-slate-700">{data.label}</span>
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded">
                        ${data.totalMRR.toLocaleString()}
                      </span>
                    </div>
                    
                    <ul className="space-y-3">
                      {data.customers.map((c) => (
                        <li key={c.id} className="flex justify-between items-start text-sm">
                          <div>
                            <div className="font-medium text-slate-700">{c.name}</div>
                            <div className="text-xs text-slate-400">
                              Go-Live: {c.onboarding?.actualEndDate}
                            </div>
                          </div>
                          <span className="font-medium text-slate-600">
                            ${c.mrr.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};