import React, { useState, useMemo } from 'react';
import { Search, Loader, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useCustomers, createCustomer, updateCustomer } from '../../hooks/useCustomers';
import type { Customer, CustomerSegment, CustomerStatus } from '../../src/types/customer.types';

function formatMRR(mrr: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(mrr);
}

function statusBadgeClass(status: CustomerStatus): string {
  switch (status) {
    case 'Onboarding':
      return 'bg-blue-100 text-blue-800';
    case 'Active':
      return 'bg-emerald-100 text-emerald-800';
    case 'At Risk':
      return 'bg-red-100 text-red-800';
    case 'Churned':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

interface CustomerManagementTableProps {
  refreshKey?: number;
  onUpdate?: () => void;
}

export const CustomerManagementTable: React.FC<CustomerManagementTableProps> = ({ refreshKey = 0, onUpdate }) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { customers, loading, error, refetch } = useCustomers(statusFilter === 'All' ? undefined : statusFilter);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.domain && c.domain.toLowerCase().includes(q))
    );
  }, [customers, search]);

  React.useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);

  const handleDelete = async (customer: Customer) => {
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setDeletingCustomer(null);
      refetch();
      onUpdate?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleSaveEdit = async (payload: Partial<Customer>) => {
    if (!editingCustomer) return;
    try {
      await updateCustomer(editingCustomer.id, payload);
      setEditingCustomer(null);
      refetch();
      onUpdate?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const handleAdd = async (payload: {
    name: string;
    domain?: string;
    segment?: CustomerSegment;
    mrr?: number;
    status?: CustomerStatus;
    contract_start?: string;
    contract_end?: string;
    account_manager?: string;
  }) => {
    try {
      await createCustomer(payload);
      setShowAddModal(false);
      refetch();
      onUpdate?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Create failed');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 flex items-center justify-center">
        <Loader size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Customers</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-48"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="All">All statuses</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Active">Active</option>
            <option value="At Risk">At Risk</option>
            <option value="Churned">Churned</option>
          </select>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <UserPlus size={18} />
            Add Customer
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="text-left py-2 pr-4 font-medium">Name</th>
              <th className="text-left py-2 pr-4 font-medium">Domain</th>
              <th className="text-left py-2 pr-4 font-medium">Segment</th>
              <th className="text-left py-2 pr-4 font-medium">MRR</th>
              <th className="text-left py-2 pr-4 font-medium">Status</th>
              <th className="text-left py-2 pr-4 font-medium">Account Manager</th>
              <th className="text-left py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c) => (
              <tr key={c.id} className="border-b border-slate-100">
                <td className="py-3 pr-4 font-medium text-slate-800">{c.name}</td>
                <td className="py-3 pr-4 text-slate-600">{c.domain || '—'}</td>
                <td className="py-3 pr-4 text-slate-600">{c.segment}</td>
                <td className="py-3 pr-4 text-slate-700">{formatMRR(c.mrr)}</td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-slate-600">{c.account_manager || '—'}</td>
                <td className="py-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(c)}
                    className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCustomer(c)}
                    className="p-1.5 rounded text-slate-500 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredCustomers.length === 0 && (
        <p className="py-8 text-center text-slate-500">No customers found</p>
      )}

      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onSave={handleSaveEdit}
          onClose={() => setEditingCustomer(null)}
        />
      )}
      {deletingCustomer && (
        <ConfirmDeleteModal
          customer={deletingCustomer}
          onConfirm={() => handleDelete(deletingCustomer)}
          onClose={() => setDeletingCustomer(null)}
        />
      )}
      {showAddModal && (
        <AddCustomerModal onSave={handleAdd} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
};

function EditCustomerModal({
  customer,
  onSave,
  onClose,
}: {
  customer: Customer;
  onSave: (p: Partial<Customer>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(customer.name);
  const [domain, setDomain] = useState(customer.domain || '');
  const [segment, setSegment] = useState(customer.segment);
  const [mrr, setMrr] = useState(String(customer.mrr));
  const [status, setStatus] = useState<CustomerStatus>(customer.status);
  const [contract_start, setContractStart] = useState(customer.contract_start || '');
  const [contract_end, setContractEnd] = useState(customer.contract_end || '');
  const [account_manager, setAccountManager] = useState(customer.account_manager || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h4 className="text-lg font-semibold text-slate-800 mb-4">Edit Customer</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Domain</label>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Segment</label>
            <select value={segment} onChange={(e) => setSegment(e.target.value as Customer['segment'])} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="Enterprise">Enterprise</option>
              <option value="Mid-Market">Mid-Market</option>
              <option value="SMB">SMB</option>
              <option value="Growth">Growth</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">MRR</label>
            <input type="number" value={mrr} onChange={(e) => setMrr(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as CustomerStatus)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="Onboarding">Onboarding</option>
              <option value="Active">Active</option>
              <option value="At Risk">At Risk</option>
              <option value="Churned">Churned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract start</label>
            <input value={contract_start} onChange={(e) => setContractStart(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract end</label>
            <input value={contract_end} onChange={(e) => setContractEnd(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account manager</label>
            <input value={account_manager} onChange={(e) => setAccountManager(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ name, domain, segment, mrr: parseFloat(mrr) || 0, status, contract_start: contract_start || null, contract_end: contract_end || null, account_manager: account_manager || null })}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ customer, onConfirm, onClose }: { customer: Customer; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <p className="text-slate-800 font-medium">Delete &quot;{customer.name}&quot;?</p>
        <p className="text-slate-500 text-sm mt-1">This cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCustomerModal({
  onSave,
  onClose,
}: {
  onSave: (p: { name: string; domain?: string; segment?: string; mrr?: number; status?: CustomerStatus; contract_start?: string; contract_end?: string; account_manager?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [segment, setSegment] = useState<Customer['segment']>('Mid-Market');
  const [mrr, setMrr] = useState('0');
  const [status, setStatus] = useState<CustomerStatus>('Active');
  const [contract_start, setContractStart] = useState('');
  const [contract_end, setContractEnd] = useState('');
  const [account_manager, setAccountManager] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h4 className="text-lg font-semibold text-slate-800 mb-4">Add Customer</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Domain</label>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Segment</label>
            <select value={segment} onChange={(e) => setSegment(e.target.value as Customer['segment'])} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="Enterprise">Enterprise</option>
              <option value="Mid-Market">Mid-Market</option>
              <option value="SMB">SMB</option>
              <option value="Growth">Growth</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">MRR</label>
            <input type="number" value={mrr} onChange={(e) => setMrr(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as CustomerStatus)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="Onboarding">Onboarding</option>
              <option value="Active">Active</option>
              <option value="At Risk">At Risk</option>
              <option value="Churned">Churned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract start</label>
            <input value={contract_start} onChange={(e) => setContractStart(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract end</label>
            <input value={contract_end} onChange={(e) => setContractEnd(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account manager</label>
            <input value={account_manager} onChange={(e) => setAccountManager(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!name.trim()) return;
              onSave({ name: name.trim(), domain: domain || undefined, segment, mrr: parseFloat(mrr) || 0, status, contract_start: contract_start || undefined, contract_end: contract_end || undefined, account_manager: account_manager || undefined });
            }}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
