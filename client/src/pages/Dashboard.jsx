import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User as UserIcon, Shield, Layers, Calendar, Settings, Database, Clock } from 'lucide-react';

export const Dashboard = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Helper to format role names
  const formatRole = (role) => {
    if (!role) return '';
    return role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  // Helper to get role badge style
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ASSET_MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DEPARTMENT_HEAD':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'EMPLOYEE':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex h-screen bg-odoo-bg overflow-hidden">
      {/* Sidebar Placeholder */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-odoo-border">
        {/* Sidebar Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-odoo-border">
          <div className="w-8 h-8 rounded-full border border-odoo-textSecondary flex items-center justify-center bg-odoo-bg font-bold text-sm text-odoo-textPrimary">
            AF
          </div>
          <span className="font-bold text-lg text-odoo-textPrimary tracking-tight">AssetFlow</span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <a href="#" className="flex items-center gap-3.5 px-3 py-2.5 bg-primary-light text-primary font-semibold rounded-lg text-sm transition-all-custom">
            <Layers className="w-5 h-5 shrink-0" />
            <span>Dashboard</span>
          </a>

          {/* Locked future modules list */}
          <div className="pt-4 pb-2 px-3 text-[11px] font-bold text-odoo-textSecondary uppercase tracking-wider">
            Enterprise Modules
          </div>

          <div className="flex items-center justify-between px-3 py-2.5 text-gray-400 cursor-not-allowed text-sm group">
            <div className="flex items-center gap-3.5">
              <Database className="w-5 h-5" />
              <span>Asset Registry</span>
            </div>
            <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200">Locked</span>
          </div>

          <div className="flex items-center justify-between px-3 py-2.5 text-gray-400 cursor-not-allowed text-sm">
            <div className="flex items-center gap-3.5">
              <Calendar className="w-5 h-5" />
              <span>Asset Bookings</span>
            </div>
            <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200">Locked</span>
          </div>

          <div className="flex items-center justify-between px-3 py-2.5 text-gray-400 cursor-not-allowed text-sm">
            <div className="flex items-center gap-3.5">
              <Settings className="w-5 h-5" />
              <span>Maintenance Logs</span>
            </div>
            <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200">Locked</span>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-odoo-border">
          <div className="flex items-center gap-3 px-3 py-2 bg-odoo-bg rounded-lg border border-odoo-border">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs uppercase">
              {user?.name?.slice(0, 2) || 'US'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-odoo-textPrimary truncate">{user?.name}</p>
              <p className="text-[10px] text-odoo-textSecondary truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-odoo-border flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-odoo-textPrimary">System Dashboard</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* User Info & Role Badge */}
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-sm font-semibold text-odoo-textPrimary">{user?.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 mt-0.5 rounded-full border uppercase ${getRoleBadgeStyle(user?.role)}`}>
                {formatRole(user?.role)}
              </span>
            </div>

            {/* Vertical Divider */}
            <span className="hidden sm:inline-block border-l border-odoo-border h-6"></span>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-2 border border-odoo-border hover:border-red-200 text-odoo-textPrimary hover:text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-all-custom focus-ring"
              title="Logout from account"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dashboard Panels */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Top Welcome Panel */}
            <div className="bg-white rounded-card shadow-sm border border-odoo-border p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-odoo-textPrimary tracking-tight">
                    Welcome back, {user?.name}!
                  </h1>
                  <p className="text-sm text-odoo-textSecondary mt-1">
                    AssetFlow Enterprise ERP system is initialized and ready.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-odoo-textSecondary font-bold uppercase tracking-wider">Access Scope</p>
                    <p className="text-sm font-bold text-odoo-textPrimary">{formatRole(user?.role)} Level</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* User Details Panel */}
              <div className="bg-white rounded-card shadow-sm border border-odoo-border p-6 md:col-span-2">
                <h3 className="text-base font-bold text-odoo-textPrimary mb-4 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-primary" />
                  Security Profile Details
                </h3>
                
                <div className="border border-odoo-border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-odoo-border text-sm">
                    <tbody className="divide-y divide-odoo-border bg-white">
                      <tr>
                        <td className="px-4 py-3 bg-odoo-bg text-odoo-textSecondary font-semibold w-1/3">Full Name</td>
                        <td className="px-4 py-3 text-odoo-textPrimary font-medium">{user?.name}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 bg-odoo-bg text-odoo-textSecondary font-semibold">Email Address</td>
                        <td className="px-4 py-3 text-odoo-textPrimary truncate">{user?.email}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 bg-odoo-bg text-odoo-textSecondary font-semibold">Prisma ID</td>
                        <td className="px-4 py-3 text-odoo-textPrimary font-mono text-xs">{user?.id}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 bg-odoo-bg text-odoo-textSecondary font-semibold">User UUID</td>
                        <td className="px-4 py-3 text-odoo-textPrimary font-mono text-xs">{user?.uuid}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 bg-odoo-bg text-odoo-textSecondary font-semibold">Status</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Active
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Info Board */}
              <div className="bg-white rounded-card shadow-sm border border-odoo-border p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-odoo-textPrimary mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Session Activity
                  </h3>
                  <p className="text-xs text-odoo-textSecondary leading-relaxed mb-4">
                    Your access token is secured and configured with automated rotation support. Any access checks are verified dynamically in real-time.
                  </p>
                </div>
                
                <div className="bg-odoo-bg p-3.5 border border-odoo-border rounded-lg text-center">
                  <span className="text-xs font-bold text-odoo-textSecondary block">Authentication Method</span>
                  <span className="text-sm font-extrabold text-primary block mt-0.5">JWT Secure Stateless</span>
                </div>
              </div>

            </div>

            {/* Odoo soft banner at bottom detailing Phase 2 lock */}
            <div className="p-5 bg-odoo-infoBg border border-[#B2EBF2] rounded-card text-xs text-odoo-infoText leading-relaxed flex items-start gap-3">
              <div className="text-lg">ℹ️</div>
              <div>
                <strong className="block text-sm font-bold mb-1">Phase 1 Integration Complete</strong>
                This environment represents the base project architecture, Prisma mapping, security middleware, and authentication structure of AssetFlow. In Phase 2, additional routes, asset registries, user-management promotes, and dashboards will be mapped over this setup.
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
