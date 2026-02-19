import React, { useState } from 'react';
import { Customer, CustomerStatus } from '../types';
import { Search, Filter, ArrowUpRight } from 'lucide-react';

interface CustomerTableProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({ customers, onSelectCustomer }) => {
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(c => {
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.domain.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: CustomerStatus) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Onboarding': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'At Risk': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTouchStatusColor = (touched: boolean) => {
    return touched 
      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
      : 'bg-amber-50 text-amber-600 border border-amber-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Table Header / Controls */}
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
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
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
            {filteredCustomers.map((customer) => (
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
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(customer.status)}`}>
                    {customer.status}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-600">
                  ${customer.mrr.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTouchStatusColor(customer.touchedThisWeek)}`}>
                    {customer.touchedThisWeek ? 'Touched' : 'Untouched'}
                  </span>
                </td>
                <td className="px-6 py-4">
                   {/* Logic to show simple indicator based on type */}
                   {customer.status === 'Onboarding' ? (
                     <div className="w-24 bg-slate-200 rounded-full h-2">
                       <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{width: `${customer.onboarding?.progress}%`}}
                       />
                     </div>
                   ) : (
                     <div className="flex items-center gap-2">
                       <div className={`w-3 h-3 rounded-full ${
                         (customer.active?.healthScore || 0) > 80 ? 'bg-emerald-500' :
                         (customer.active?.healthScore || 0) > 50 ? 'bg-amber-500' : 'bg-red-500'
                       }`} />
                       <span className="text-sm text-slate-600">{customer.active?.healthScore}/100</span>
                     </div>
                   )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-primary transition-colors">
                    <ArrowUpRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
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
