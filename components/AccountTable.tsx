import React, { useState } from 'react';
import { Search, Filter, ArrowUpRight, ChevronDown, ChevronRight, Globe } from 'lucide-react';
import { useEnrichedAccounts, type EnrichedAccount } from '../hooks/useEnrichedAccounts';
import type { AccountClientStatus } from '../src/types/account.types';

interface AccountTableProps {
  onSelectAccount: (account: EnrichedAccount) => void;
}

export const AccountTable: React.FC<AccountTableProps> = ({ onSelectAccount }) => {
  const { accounts, loading } = useEnrichedAccounts();
  const [filterStatus, setFilterStatus] = useState<AccountClientStatus | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  const filteredAccounts = accounts.filter((a) => {
    const matchesStatus = filterStatus === 'All' || a.dominant_status === filterStatus;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      a.account_name.toLowerCase().includes(term) ||
      a.clients.some(
        (c) =>
          c.client_name.toLowerCase().includes(term) ||
          (c.tenant_name?.toLowerCase().includes(term) ?? false)
      ) ||
      (a.country?.toLowerCase().includes(term) ?? false);
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: AccountClientStatus) => {
    switch (status) {
      case 'Live':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Setup':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Churned':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const healthBarColor = (score: number) => {
    if (score > 70) return 'bg-emerald-500';
    if (score > 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const satisfactionBarColor = (score: number) => {
    if (score > 70) return 'bg-blue-500';
    if (score > 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAccount((prev) => (prev === id ? null : id));
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-5" /></td>
      <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-40" /></td>
      <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-8" /></td>
      <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
      <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
      <td className="px-4 py-4"><div className="h-6 bg-slate-200 rounded-full w-16" /></td>
      <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
      <td className="px-4 py-4"><div className="h-2 bg-slate-200 rounded-full w-24" /></td>
      <td className="px-4 py-4"><div className="h-2 bg-slate-200 rounded-full w-24" /></td>
      <td className="px-4 py-4"><div className="h-5 bg-slate-200 rounded w-5 ml-auto" /></td>
    </tr>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-800">All Accounts</h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search accounts, clients, tenants..."
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative flex items-center">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AccountClientStatus | 'All')}
            >
              <option value="All">All Statuses</option>
              <option value="Setup">Setup</option>
              <option value="Live">Live</option>
              <option value="Churned">Churned</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 font-medium w-8" />
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Clients</th>
              <th className="px-4 py-3 font-medium">Total MRR</th>
              <th className="px-4 py-3 font-medium">Primary PM</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 font-medium">Health</th>
              <th className="px-4 py-3 font-medium">Satisfaction</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}
            {!loading &&
              filteredAccounts.map((account) => {
                const isExpanded = expandedAccount === account.id;
                return (
                  <React.Fragment key={account.id}>
                    <tr
                      onClick={() => onSelectAccount(account)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-4">
                        {account.client_count > 1 && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(account.id, e)}
                            className="text-slate-400 hover:text-slate-600"
                            aria-label={isExpanded ? 'Collapse clients' : 'Expand clients'}
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">{account.account_name}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {account.client_count}
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-600">
                        ${account.total_mrr.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {account.primary_pm ?? '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(account.dominant_status)}`}
                        >
                          {account.dominant_status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {account.country ? (
                          <span className="flex items-center gap-1">
                            <Globe size={14} className="text-slate-400" />
                            {account.country}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${healthBarColor(account.health_score)}`}
                              style={{ width: `${Math.min(100, Math.max(0, account.health_score))}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-8">{account.health_score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${satisfactionBarColor(account.satisfaction_score)}`}
                              style={{ width: `${Math.min(100, Math.max(0, account.satisfaction_score))}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-8">{account.satisfaction_score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button className="text-slate-400 hover:text-blue-600 transition-colors">
                          <ArrowUpRight size={18} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && account.clients.map((client) => (
                      <tr key={client.id} className="bg-slate-50/50">
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 pl-10">
                          <div className="text-sm text-slate-700">{client.client_name}</div>
                          {client.tenant_name && (
                            <div className="text-xs text-slate-400">{client.tenant_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-sm text-slate-500">
                          ${client.mrr.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-500">
                          {client.project_manager ?? '—'}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(client.status)}`}
                          >
                            {client.status}
                          </span>
                        </td>
                        <td className="px-4 py-2" colSpan={4} />
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            {!loading && accounts.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-10 text-center text-slate-400">
                  No accounts yet. Import accounts from Admin &rarr; Accounts tab.
                </td>
              </tr>
            )}
            {!loading && accounts.length > 0 && filteredAccounts.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-10 text-center text-slate-400">
                  No accounts found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
