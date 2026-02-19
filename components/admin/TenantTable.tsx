import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Loader } from 'lucide-react';
import { Tenant } from '../../types/tenant';

interface TenantTableProps {
  onUpdate: () => void;
}

export const TenantTable: React.FC<TenantTableProps> = ({ onUpdate }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenants');
      if (!response.ok) throw new Error('Failed to fetch tenants');
      const data: Tenant[] = await response.json();
      setTenants(data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (tenant: Tenant) => {
    setUpdatingIds((prev) => new Set(prev).add(tenant.id));
    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !tenant.is_active }),
      });

      if (!response.ok) throw new Error('Failed to update tenant');

      // Update local state
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenant.id ? { ...t, is_active: !t.is_active } : t
        )
      );
      onUpdate();
    } catch (error) {
      console.error('Error updating tenant:', error);
      alert('Failed to update tenant status');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(tenant.id);
        return next;
      });
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      tenant.tenant_name.toLowerCase().includes(searchLower) ||
      tenant.account.toLowerCase().includes(searchLower) ||
      (tenant.tenant_owner?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 flex items-center justify-center">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-800">Tenant List</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search tenants..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-medium">Tenant Name</th>
              <th className="px-6 py-4 font-medium">Account</th>
              <th className="px-6 py-4 font-medium">Tenant Owner</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-800">
                  {tenant.tenant_name}
                </td>
                <td className="px-6 py-4 text-slate-600">{tenant.account}</td>
                <td className="px-6 py-4 text-slate-600">
                  {tenant.tenant_owner || '-'}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      tenant.is_active
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {tenant.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleToggleActive(tenant)}
                    disabled={updatingIds.has(tenant.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      tenant.is_active
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={tenant.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {updatingIds.has(tenant.id) ? (
                      <Loader size={18} className="animate-spin" />
                    ) : tenant.is_active ? (
                      <XCircle size={18} />
                    ) : (
                      <CheckCircle size={18} />
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {filteredTenants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                  {searchTerm ? 'No tenants found matching your search.' : 'No tenants found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

