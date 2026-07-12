import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../services/api';
import { 
  Building2, Laptop, Users, Award, Shield, ShieldCheck,
  Layers, Clock, ArrowRight, User, Calendar, Wrench
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Fetch Dashboard Stats (only if Admin)
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/api/employees/dashboard-stats');
      return res.data.data;
    },
    enabled: isAdmin,
  });

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

  const formatRole = (role) => {
    if (!role) return '';
    return role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  return (
    <DashboardLayout 
      title="Dashboard" 
      breadcrumbs={[{ label: 'Home', path: '/dashboard' }, { label: 'Dashboard' }]}
    >
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Welcome Message Card */}
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

        {/* Admin Metric Cards Panel */}
        {isAdmin && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-odoo-textSecondary uppercase tracking-wider">
                Organization Setup Metrics
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                
                {/* Total Departments */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Departments</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : stats?.totalDepartments}
                    </span>
                  </div>
                </div>

                {/* Total Categories */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Categories</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : stats?.totalCategories}
                    </span>
                  </div>
                </div>

                {/* Total Employees */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Employees</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : stats?.totalEmployees}
                    </span>
                  </div>
                </div>

                {/* Department Heads count */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Dept Heads</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : stats?.departmentHeads}
                    </span>
                  </div>
                </div>

                {/* Asset Managers count */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Asset Managers</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : stats?.assetManagers}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-odoo-textSecondary uppercase tracking-wider">
                Asset Allocation & Operations
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* Active Allocations */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Active Allocations</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : (stats?.activeAllocations || 0)}
                    </span>
                  </div>
                </div>

                {/* Pending Transfers */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Pending Transfers</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : (stats?.pendingTransfers || 0)}
                    </span>
                  </div>
                </div>

                {/* Overdue Returns */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Overdue Returns</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : (stats?.overdueReturns || 0)}
                    </span>
                  </div>
                </div>

                {/* Assets Due Today */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Assets Due Today</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : (stats?.assetsDueToday || 0)}
                    </span>
                  </div>
                </div>

              </div>

              {/* Recent Allocations list panel */}
              <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-odoo-textSecondary">
                  Recent Asset Allocations
                </h3>
                {stats?.recentAllocations && stats.recentAllocations.length > 0 ? (
                  <div className="divide-y divide-odoo-border text-xs">
                    {stats.recentAllocations.map((alloc) => (
                      <div key={alloc.id} className="py-2.5 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-odoo-textPrimary">{alloc.asset.name}</span>
                          <span className="text-[10px] text-gray-400 block">{alloc.asset.assetTag}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-odoo-textSecondary">Allocated to {alloc.employee.name}</span>
                          <span className="text-[10px] text-gray-400 block">{new Date(alloc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic block py-2">No recent allocations found.</span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-odoo-textSecondary uppercase tracking-wider">
                Resource Booking & Maintenance Operations
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                
                {/* Resources Booked Today */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Booked Today</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : (stats?.resourcesBookedToday || 0)}
                    </span>
                  </div>
                </div>

                {/* Available Resources */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Available Resources</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : (stats?.availableResources || 0)}
                    </span>
                  </div>
                </div>

                {/* Pending Maintenance */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Pending Repair</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : (stats?.pendingMaintenance || 0)}
                    </span>
                  </div>
                </div>

                {/* Assets Under Maintenance */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">In Maintenance</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : (stats?.assetsUnderMaintenance || 0)}
                    </span>
                  </div>
                </div>

                {/* Maintenance Completed Today */}
                <div className="bg-white p-5 rounded-card shadow-sm border border-odoo-border flex items-center gap-4 hover:shadow-md transition-all-custom">
                  <div className="w-11 h-11 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-odoo-textSecondary font-semibold uppercase tracking-wider block">Fixed Today</span>
                    <span className="text-2xl font-extrabold text-odoo-textPrimary block mt-0.5">
                      {isStatsLoading ? '...' : (stats?.maintenanceCompletedToday || 0)}
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Dashboard Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* User Details Panel */}
          <div className="bg-white rounded-card shadow-sm border border-odoo-border p-6 md:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-odoo-textSecondary uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Security Profile Details
            </h3>
            
            <div className="border border-odoo-border rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-odoo-border text-sm">
                <tbody className="divide-y divide-odoo-border bg-white">
                  <tr>
                    <td className="px-4 py-3 bg-odoo-bg text-odoo-textSecondary font-semibold w-1/3">Full Name</td>
                    <td className="px-4 py-3 text-odoo-textPrimary font-semibold">{user?.name}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 bg-odoo-bg text-odoo-textSecondary font-semibold">Email Address</td>
                    <td className="px-4 py-3 text-odoo-textPrimary truncate">{user?.email}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 bg-odoo-bg text-odoo-textSecondary font-semibold">User UUID</td>
                    <td className="px-4 py-3 text-odoo-textPrimary font-mono text-xs">{user?.uuid}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 bg-odoo-bg text-odoo-textSecondary font-semibold">Security Role</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getRoleBadgeStyle(user?.role)}`}>
                        {formatRole(user?.role)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 bg-odoo-bg text-odoo-textSecondary font-semibold">Status</td>
                    <td className="px-4 py-3 font-semibold text-green-700">ACTIVE</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white rounded-card shadow-sm border border-odoo-border p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-odoo-textSecondary uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Quick Operations
              </h3>
              <p className="text-xs text-odoo-textSecondary leading-relaxed">
                Your authorization level grants you permission to view and administer structural assets and employee roles.
              </p>
            </div>
            
            <div className="space-y-2 mt-6">
              {isAdmin ? (
                <Link
                  to="/organization-setup"
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all-custom"
                >
                  <span>Manage Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="bg-odoo-bg p-3 border border-odoo-border rounded-lg text-center text-xs text-odoo-textSecondary font-semibold">
                  Standard Employee Account
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
