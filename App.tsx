import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Bell, Settings, LogOut, Shield, Brain, ShoppingBag, UploadCloud, Trash2 } from 'lucide-react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { DashboardOverview } from './components/DashboardOverview';
import { AccountTable } from './components/AccountTable';
import { AccountDetail } from './components/AccountDetail';
import { AdminPanel } from './components/admin/AdminPanel';
import { SignIn } from './components/SignIn';
import { useEmailDomainCheck } from './hooks/useEmailDomainCheck';
import { useAdminAccess } from './hooks/useAdminAccess';
import type { EnrichedAccount } from './hooks/useEnrichedAccounts';
import { DataUploadModal } from './src/components/shared/DataUploadModal';
import { ErrorBoundary } from './src/components/shared/ErrorBoundary';
import { MeetingIntelligenceLayout } from './src/components/meeting-intelligence/MeetingIntelligenceLayout';
import { SalesOrdersLayout } from './src/components/sales/SalesOrdersLayout';
import { useDataStore, hydrateFromIndexedDB } from './src/store/dataStore';

const App: React.FC = () => {
  const [selectedAccount, setSelectedAccount] = useState<EnrichedAccount | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'meeting-intel' | 'sales-orders' | 'admin'>('dashboard');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [meetingIntelTab, setMeetingIntelTab] = useState<'overview' | 'pm' | 'customer' | 'risk' | 'knowledge'>('overview');
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isEmailAllowed } = useEmailDomainCheck();
  const { isAdmin } = useAdminAccess();
  const uploadedFiles = useDataStore((s) => s.uploadedFiles);
  const clearAllData = useDataStore((s) => s.clearAllData);
  const isHydrated = useDataStore((s) => s.isHydrated);
  const hasUploadedFiles = Object.keys(uploadedFiles).length > 0;

  useEffect(() => {
    const storeState = useDataStore.getState();
    hydrateFromIndexedDB(storeState).catch(console.error);
  }, []);
  const riskSignals = useDataStore((s) => s.riskSignals);
  const pipelineOrders = useDataStore((s) => s.pipelineOrders);
  const hasHighChurnRisk = riskSignals.some((r) => r.churn_risk === 'high');
  const today = new Date().toISOString().slice(0, 10);
  const overduePipelineCount = pipelineOrders.filter((o) => o.due_date && o.due_date < today).length;

  // Show sign in if not authenticated or email domain not allowed
  if (!user || !isEmailAllowed()) {
    return <SignIn />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">P</div>
            <span className="font-bold text-lg">Pulse CS</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('accounts')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'accounts' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users size={20} />
            All Accounts
          </button>
          <button 
            onClick={() => setActiveTab('meeting-intel')}
            className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'meeting-intel' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Brain size={20} />
            Meeting Intel
            {hasHighChurnRisk && (
              <span className="absolute top-2 right-3 h-2.5 w-2.5 rounded-full bg-red-500" aria-label="High churn risk" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('sales-orders')}
            className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'sales-orders' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <ShoppingBag size={20} />
            Sales Orders
            {overduePipelineCount > 0 && (
              <span className="absolute top-1/2 right-3 -translate-y-1/2 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                {overduePipelineCount}
              </span>
            )}
          </button>
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'admin' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Shield size={20} />
              Admin
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <Settings size={18} />
            <span>Settings</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {!isHydrated && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
            Loading saved data...
          </div>
        )}
        <header className="bg-white border-b border-slate-100 p-6 flex justify-between items-center sticky top-0 z-30">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {activeTab === 'dashboard' && 'Weekly Overview'}
              {activeTab === 'accounts' && 'Customer Accounts'}
              {activeTab === 'meeting-intel' && 'Meeting Intelligence'}
              {activeTab === 'sales-orders' && 'Sales Orders'}
              {activeTab === 'admin' && 'Admin'}
            </h1>
            <p className="text-slate-500 text-sm">
              Welcome back, {user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'}.
            </p>
          </div>
          <div className="flex items-center gap-4">
             {hasUploadedFiles && (
               <button
                 type="button"
                 onClick={() => {
                   if (window.confirm('Clear all uploaded CSV data from this device? This cannot be undone.')) {
                     clearAllData();
                     window.location.reload();
                   }
                 }}
                 className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
               >
                 <Trash2 size={18} />
                 Clear Data
               </button>
             )}
             <button
               type="button"
               onClick={() => setUploadModalOpen(true)}
               className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
             >
               <UploadCloud size={18} />
               Update Data
               {hasUploadedFiles && (
                 <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden />
               )}
             </button>
             <button className="relative p-2 text-slate-400 hover:text-slate-600">
               <Bell size={20} />
               <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
             </button>
             <div className="relative group">
               <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold cursor-pointer">
                 {user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0].toUpperCase() || 'U'}
               </div>
               <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                 <div className="p-4 border-b border-slate-100">
                   <p className="font-semibold text-slate-800 text-sm">
                     {user?.firstName && user?.lastName 
                       ? `${user.firstName} ${user.lastName}`
                       : user?.primaryEmailAddress?.emailAddress}
                   </p>
                   <p className="text-xs text-slate-500 mt-1">
                     {user?.primaryEmailAddress?.emailAddress}
                   </p>
                 </div>
                 <button
                   onClick={() => signOut()}
                   className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                 >
                   <LogOut size={16} />
                   Sign Out
                 </button>
               </div>
             </div>
          </div>
        </header>

        <div
          className={`p-6 space-y-8 ${
            activeTab === 'sales-orders' ? 'max-w-none w-full mx-auto' : 'max-w-7xl mx-auto'
          }`}
        >
          {activeTab === 'dashboard' && (
            <>
              <DashboardOverview
                onNavigateToRisk={() => {
                  setActiveTab('meeting-intel');
                  setMeetingIntelTab('risk');
                }}
              />
              <AccountTable onSelectAccount={setSelectedAccount} />
            </>
          )}

          {activeTab === 'accounts' && (
             <AccountTable onSelectAccount={setSelectedAccount} />
          )}

          {activeTab === 'meeting-intel' && (
            <ErrorBoundary onRetry={clearAllData}>
              <MeetingIntelligenceLayout
                onOpenUploadModal={() => setUploadModalOpen(true)}
                selectedTab={meetingIntelTab}
                onTabChange={setMeetingIntelTab}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'sales-orders' && (
            <ErrorBoundary onRetry={clearAllData}>
              <SalesOrdersLayout onOpenUploadModal={() => setUploadModalOpen(true)} />
            </ErrorBoundary>
          )}

          {activeTab === 'admin' && isAdmin && (
            <AdminPanel />
          )}
        </div>
      </main>

      {/* Detail Modal/Slide-over */}
      {selectedAccount && (
        <AccountDetail
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
        />
      )}

      <DataUploadModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />
    </div>
  );
};

export default App;
