import React, { useState } from 'react';
import { Shield, Users, Database, Building2 } from 'lucide-react';
import { TenantUpload } from './TenantUpload';
import { TenantTable } from './TenantTable';
import { CustomerImport } from './CustomerImport';
import { CustomerManagementTable } from './CustomerManagementTable';
import { AccountImport } from './AccountImport';

type AdminTab = 'accounts' | 'customers' | 'tenants';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('accounts');
  const [tenantRefreshKey, setTenantRefreshKey] = useState(0);
  const [customerRefreshKey, setCustomerRefreshKey] = useState(0);
  const [accountRefreshKey, setAccountRefreshKey] = useState(0);

  const handleTenantImportComplete = () => {
    setTenantRefreshKey((prev) => prev + 1);
  };

  const handleCustomerImportComplete = () => {
    setCustomerRefreshKey((prev) => prev + 1);
  };

  const handleAccountImportComplete = () => {
    setAccountRefreshKey((prev) => prev + 1);
  };

  const handleTenantTableUpdate = () => {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
            <p className="text-slate-500 text-sm">Manage customers and tenants</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'accounts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 size={18} />
          Accounts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'customers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={18} />
          Customers (Legacy)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tenants')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tenants'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Database size={18} />
          Tenants
        </button>
      </div>

      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <AccountImport key={accountRefreshKey} onImportComplete={handleAccountImportComplete} />
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustomerManagementTable key={customerRefreshKey} refreshKey={customerRefreshKey} onUpdate={() => setCustomerRefreshKey((k) => k + 1)} />
          <CustomerImport onImportComplete={handleCustomerImportComplete} />
        </div>
      )}

      {activeTab === 'tenants' && (
        <div className="space-y-6">
          <TenantUpload onImportComplete={handleTenantImportComplete} />
          <TenantTable key={tenantRefreshKey} onUpdate={handleTenantTableUpdate} />
        </div>
      )}
    </div>
  );
};

