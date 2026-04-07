import React, { useState } from 'react';
import { Search, Filter, ArrowUpRight } from 'lucide-react';
import { useEnrichedCustomers, type EnrichedCustomer } from '../hooks/useEnrichedCustomers';
import type { CustomerStatus } from '../src/types/customer.types';

interface CustomerTableProps {
  onSelectCustomer: (customer: EnrichedCustomer) => void;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({ onSelectCustomer }) => {
  const { customers, loading } = useEnrichedCustomers();
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter((c) => {
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.domain.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: CustomerStatus) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Onboarding':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'At Risk':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Churned':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getTouchStatusColor = (touch: 'Touched' | 'Untouched') => {
    return touch === 'Touched'
      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
      : 'bg-amber-50 text-amber-600 border border-amber-200';
  };

  const healthBarColor = (score: number) => {
    if (score > 80) return 'bg-emerald-500';
    if (score > 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-200 rounded w-40 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-28" />
      </td>
      <td className="px-6 py-4">
        <div className="h-6 bg-slate-200 rounded-full w-20" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-slate-200 rounded w-16" />
      </td>
      <td className="px-6 py-4">
        <div className="h-6 bg-slate-200 rounded-full w-24" />
      </td>
      <td className="px-6 py-4">
        <div className="h-2 bg-slate-200 rounded-full w-24" />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="h-5 bg-slate-200 rounded w-5 ml-auto" />
      </td>
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
              placeholder="Search companies..."
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative flex items-center">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as CustomerStatus | 'All')}
            >
              <option value="All">All Statuses</option>
              <option value="Onboarding">Onboarding</option>
              <option value="Active">Active</option>
              <option value="At Risk">At Risk</option>
              <option value="Churned">Churned</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-medium">Customer</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">MRR</th>
              <th className="px-6 py-4 font-medium">Touch Status</th>
              <th className="px-6 py-4 font-medium">Health</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
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
              filteredCustomers.map((customer) => {
                const health = customer.health_score ?? 0;
                const touch = customer.touch_status ?? 'Untouched';
                return (
                  <tr
                    key={customer.id}
                    onClick={() => onSelectCustomer(customer)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-slate-800">{customer.name}</div>
                        <div className="text-xs text-slate-400">{customer.domain}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(customer.status)}`}
                      >
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">${customer.mrr.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTouchStatusColor(touch)}`}>
                        {touch}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${healthBarColor(health)}`} />
                        <div className="w-24 bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${healthBarColor(health)}`}
                            style={{ width: `${Math.min(100, Math.max(0, health))}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600">{health}/100</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-primary transition-colors">
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                  No customers yet. Import customers from Admin → Customers tab.
                </td>
              </tr>
            )}
            {!loading && customers.length > 0 && filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                  No customers found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
