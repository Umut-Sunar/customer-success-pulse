import React, { useState } from 'react';
import { LayoutDashboard, Users, Bell, Settings, LogOut, Shield } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { DashboardOverview } from './components/DashboardOverview';
import { CustomerTable } from './components/CustomerTable';
import { CustomerDetail } from './components/CustomerDetail';
import { AdminPanel } from './components/admin/AdminPanel';
import { SignIn } from './components/SignIn';
import { useEmailDomainCheck } from './hooks/useEmailDomainCheck';
import { useAdminAccess } from './hooks/useAdminAccess';
import { MOCK_CUSTOMERS } from './constants';
import { Customer } from './types';

const App: React.FC = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'admin'>('dashboard');
  const { user, signOut } = useUser();
  const { isEmailAllowed } = useEmailDomainCheck();
  const { isAdmin } = useAdminAccess();

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
        <header className="bg-white border-b border-slate-100 p-6 flex justify-between items-center sticky top-0 z-30">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {activeTab === 'dashboard' ? 'Weekly Overview' : 'Customer Accounts'}
            </h1>
            <p className="text-slate-500 text-sm">
              Welcome back, {user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'}.
            </p>
          </div>
          <div className="flex items-center gap-4">
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

        <div className="p-6 max-w-7xl mx-auto space-y-8">
          {activeTab === 'dashboard' && (
            <>
              <DashboardOverview customers={MOCK_CUSTOMERS} />
              <CustomerTable customers={MOCK_CUSTOMERS} onSelectCustomer={setSelectedCustomer} />
            </>
          )}

          {activeTab === 'accounts' && (
             <CustomerTable customers={MOCK_CUSTOMERS} onSelectCustomer={setSelectedCustomer} />
          )}

          {activeTab === 'admin' && isAdmin && (
            <AdminPanel />
          )}
        </div>
      </main>

      {/* Detail Modal/Slide-over */}
      {selectedCustomer && (
        <CustomerDetail 
          customer={selectedCustomer} 
          onClose={() => setSelectedCustomer(null)} 
        />
      )}
    </div>
  );
};

export default App;
