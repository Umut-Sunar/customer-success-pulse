import React, { useState } from 'react';
import { Shield, Upload, Database } from 'lucide-react';
import { TenantUpload } from './TenantUpload';
import { TenantTable } from './TenantTable';

export const AdminPanel: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImportComplete = () => {
    // Trigger refresh of tenant table
    setRefreshKey((prev) => prev + 1);
  };

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
            <p className="text-slate-500 text-sm">Manage tenants and import data</p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <TenantUpload onImportComplete={handleImportComplete} />

      {/* Tenant Table */}
      <TenantTable key={refreshKey} onUpdate={handleImportComplete} />
    </div>
  );
};

