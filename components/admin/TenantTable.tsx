import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Loader, Filter, Trash2, UserPlus, CheckSquare, Square } from 'lucide-react';
import { Tenant } from '../../types/tenant';

interface TenantTableProps {
  onUpdate: () => void;
}

interface FilterState {
  account: string;
  tenantName: string;
  tenantOwner: string;
  status: 'all' | 'active' | 'inactive';
}

export const TenantTable: React.FC<TenantTableProps> = ({ onUpdate }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [selectedTenants, setSelectedTenants] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    account: '',
    tenantName: '',
    tenantOwner: '',
    status: 'all',
  });
  const [deleting, setDeleting] = useState(false);
  const [addingToCustomers, setAddingToCustomers] = useState(false);

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

  const handleToggleActive = async (tenant: Tenant, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setUpdatingIds((prev) => new Set(prev).add(tenant.id));
    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !tenant.is_active }),
      });

      if (!response.ok) throw new Error('Failed to update tenant');

      // Update local state without page refresh
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenant.id ? { ...t, is_active: !t.is_active } : t
        )
      );
      // DO NOT call onUpdate() to prevent page refresh
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

  const handleSelectTenant = (tenantId: number) => {
    setSelectedTenants((prev) => {
      const next = new Set(prev);
      if (next.has(tenantId)) {
        next.delete(tenantId);
      } else {
        next.add(tenantId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTenants.size === filteredTenants.length) {
      setSelectedTenants(new Set());
    } else {
      setSelectedTenants(new Set(filteredTenants.map(t => t.id)));
    }
  };

  const handleDeleteTenant = async (tenantId: number, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!confirm('Are you sure you want to delete this tenant?')) {
      return;
    }

    setUpdatingIds((prev) => new Set(prev).add(tenantId));
    try {
      const response = await fetch(`/api/tenants/${tenantId}`, { method: 'DELETE' });
      
      if (!response.ok) {
        throw new Error('Failed to delete tenant');
      }

      // Update local state without page refresh
      setTenants((prev) => prev.filter(t => t.id !== tenantId));
      // Remove from selection if selected
      setSelectedTenants((prev) => {
        const next = new Set(prev);
        next.delete(tenantId);
        return next;
      });
      // DO NOT call onUpdate() to prevent page refresh
    } catch (error) {
      console.error('Error deleting tenant:', error);
      alert('Failed to delete tenant');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(tenantId);
        return next;
      });
    }
  };

  const handleDeleteSelected = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (selectedTenants.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTenants.size} tenant(s)?`)) {
      return;
    }

    setDeleting(true);
    try {
      const deletePromises = Array.from(selectedTenants).map(id =>
        fetch(`/api/tenants/${id}`, { method: 'DELETE' })
      );
      
      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        alert(`Failed to delete ${failed.length} tenant(s)`);
      } else {
        // Update local state without page refresh
        setTenants((prev) => prev.filter(t => !selectedTenants.has(t.id)));
        setSelectedTenants(new Set());
        // DO NOT call onUpdate() to prevent page refresh
      }
    } catch (error) {
      console.error('Error deleting tenants:', error);
      alert('Failed to delete tenants');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddToCustomers = async () => {
    if (selectedTenants.size === 0) return;

    setAddingToCustomers(true);
    try {
      const selectedTenantData = filteredTenants.filter(t => selectedTenants.has(t.id));
      
      const response = await fetch('/api/tenants/add-to-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantIds: Array.from(selectedTenants),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add tenants to customers');
      }

      const result = await response.json();
      alert(`Successfully added ${result.added} tenant(s) to customers. ${result.skipped > 0 ? `${result.skipped} already existed.` : ''}`);
      
      setSelectedTenants(new Set());
      // DO NOT call onUpdate() to prevent page refresh
    } catch (error: any) {
      console.error('Error adding tenants to customers:', error);
      alert(error.message || 'Failed to add tenants to customers');
    } finally {
      setAddingToCustomers(false);
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    // Search term filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      tenant.tenant_name.toLowerCase().includes(searchLower) ||
      tenant.account.toLowerCase().includes(searchLower) ||
      (tenant.tenant_owner?.toLowerCase().includes(searchLower) ?? false)
    );

    // Advanced filters
    const matchesAccount = !filters.account || tenant.account.toLowerCase().includes(filters.account.toLowerCase());
    const matchesTenantName = !filters.tenantName || tenant.tenant_name.toLowerCase().includes(filters.tenantName.toLowerCase());
    const matchesTenantOwner = !filters.tenantOwner || (tenant.tenant_owner?.toLowerCase().includes(filters.tenantOwner.toLowerCase()) ?? false);
    const matchesStatus = filters.status === 'all' || 
      (filters.status === 'active' && tenant.is_active) ||
      (filters.status === 'inactive' && !tenant.is_active);

    return matchesSearch && matchesAccount && matchesTenantName && matchesTenantOwner && matchesStatus;
  });

  const clearFilters = () => {
    setFilters({
      account: '',
      tenantName: '',
      tenantOwner: '',
      status: 'all',
    });
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 flex items-center justify-center">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Tenant List</h3>
          <div className="flex items-center gap-3">
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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Filter size={16} />
              Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Account</label>
                <input
                  type="text"
                  placeholder="Filter by account..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={filters.account}
                  onChange={(e) => setFilters({ ...filters, account: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tenant Name</label>
                <input
                  type="text"
                  placeholder="Filter by tenant name..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={filters.tenantName}
                  onChange={(e) => setFilters({ ...filters, tenantName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tenant Owner</label>
                <input
                  type="text"
                  placeholder="Filter by owner..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={filters.tenantOwner}
                  onChange={(e) => setFilters({ ...filters, tenantOwner: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-slate-600 hover:text-slate-800 underline"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedTenants.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              {selectedTenants.size} tenant(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddToCustomers}
                disabled={addingToCustomers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addingToCustomers ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Add to Customers
                  </>
                )}
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-medium w-12">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center justify-center"
                  title="Select all"
                >
                  {selectedTenants.size === filteredTenants.length && filteredTenants.length > 0 ? (
                    <CheckSquare size={18} className="text-blue-600" />
                  ) : (
                    <Square size={18} className="text-slate-400" />
                  )}
                </button>
              </th>
              <th className="px-6 py-4 font-medium">Tenant Name</th>
              <th className="px-6 py-4 font-medium">Account</th>
              <th className="px-6 py-4 font-medium">Tenant Owner</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTenants.map((tenant) => (
              <tr 
                key={tenant.id} 
                className={`hover:bg-slate-50 transition-colors ${
                  selectedTenants.has(tenant.id) ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleSelectTenant(tenant.id)}
                    className="flex items-center justify-center"
                  >
                    {selectedTenants.has(tenant.id) ? (
                      <CheckSquare size={18} className="text-blue-600" />
                    ) : (
                      <Square size={18} className="text-slate-400" />
                    )}
                  </button>
                </td>
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
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => handleToggleActive(tenant, e)}
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
                    <button
                      onClick={(e) => handleDeleteTenant(tenant.id, e)}
                      disabled={updatingIds.has(tenant.id)}
                      className="p-2 rounded-lg transition-colors text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete tenant"
                    >
                      {updatingIds.has(tenant.id) ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTenants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                  {searchTerm || Object.values(filters).some(v => v !== '' && v !== 'all')
                    ? 'No tenants found matching your filters.'
                    : 'No tenants found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
