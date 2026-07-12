import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, Layers, Settings, Database, Calendar, 
  Wrench, ShieldCheck, FileText, Bell, ChevronRight, Menu, X, Shield 
} from 'lucide-react';

export const DashboardLayout = ({ children, title = '', breadcrumbs = [] }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  const formatRole = (role) => {
    if (!role) return '';
    return role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ASSET_MANAGER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DEPARTMENT_HEAD':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'EMPLOYEE':
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const sidebarLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: Layers, enabled: true },
    { label: 'Organization Setup', path: '/organization-setup', icon: Settings, enabled: isAdmin },
    { label: 'Assets', path: '/assets', icon: Database, enabled: true },
    { label: 'Allocation & Transfer', path: '#', icon: ShieldCheck, enabled: false },
    { label: 'Resource Booking', path: '#', icon: Calendar, enabled: false },
    { label: 'Maintenance', path: '#', icon: Wrench, enabled: false },
    { label: 'Audit', path: '#', icon: Shield, enabled: false },
    { label: 'Reports', path: '#', icon: FileText, enabled: false },
    { label: 'Notifications', path: '#', icon: Bell, enabled: false },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-odoo-border">
      {/* Sidebar Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-odoo-border shrink-0">
        <div className="w-8 h-8 rounded-full border border-odoo-textSecondary flex items-center justify-center bg-odoo-bg font-extrabold text-sm text-odoo-textPrimary">
          AF
        </div>
        <span className="font-extrabold text-lg text-odoo-textPrimary tracking-tight">AssetFlow</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {sidebarLinks.map((link, idx) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;

          if (!link.enabled && link.label === 'Organization Setup') {
            // Hide Org Setup completely if not Admin as per spec
            return null;
          }

          if (!link.enabled) {
            return (
              <div 
                key={idx}
                className="flex items-center justify-between px-3 py-2.5 text-gray-400 cursor-not-allowed text-sm font-medium"
                title={`${link.label} is coming soon in Phase 2`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className="w-4.5 h-4.5 text-gray-300" />
                  <span>{link.label}</span>
                </div>
                <span className="text-[9px] font-extrabold bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200">Locked</span>
              </div>
            );
          }

          return (
            <Link
              key={idx}
              to={link.path}
              onClick={() => setIsMobileSidebarOpen(false)}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm transition-all-custom font-medium ${
                isActive
                  ? 'bg-primary-light text-primary font-bold shadow-sm'
                  : 'text-odoo-textPrimary hover:bg-gray-50 hover:text-primary'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer profile summary */}
      <div className="p-4 border-t border-odoo-border shrink-0">
        <div className="flex items-center gap-3 p-3 bg-odoo-bg rounded-xl border border-odoo-border">
          <div className="w-8.5 h-8.5 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
            {user?.name?.slice(0, 2) || 'AF'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-odoo-textPrimary truncate">{user?.name}</p>
            <p className="text-[9.5px] text-odoo-textSecondary truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-odoo-bg overflow-hidden font-sans">
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Sidebar */}
      <div className={`fixed inset-0 z-50 flex md:hidden transition-all duration-300 ${isMobileSidebarOpen ? 'visible' : 'invisible'}`}>
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileSidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
        ></div>
        <div className={`relative w-64 max-w-xs bg-white transform transition-transform duration-300 flex flex-col h-full ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <SidebarContent />
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="absolute top-4 right-[-45px] p-1.5 bg-white rounded-md border border-odoo-border text-gray-500 shadow-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-odoo-border flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-md border border-odoo-border text-gray-500 hover:bg-gray-50 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Title / Breadcrumb */}
            <div className="hidden sm:flex flex-col justify-center">
              {breadcrumbs.length > 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-odoo-textSecondary font-medium">
                  {breadcrumbs.map((bc, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                      {bc.path ? (
                        <Link to={bc.path} className="hover:text-primary hover:underline transition-colors">{bc.label}</Link>
                      ) : (
                        <span>{bc.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-odoo-textSecondary font-semibold uppercase tracking-wider">AssetFlow ERP</span>
              )}
              {title && <h1 className="text-base font-extrabold text-odoo-textPrimary leading-tight mt-0.5">{title}</h1>}
            </div>
          </div>

          <div className="flex items-center gap-4.5">
            <div className="flex flex-col items-end text-right">
              <span className="text-xs font-bold text-odoo-textPrimary">{user?.name}</span>
              <span className={`text-[9px] font-extrabold px-2 py-0.5 mt-0.5 rounded-full border uppercase tracking-wider ${getRoleBadgeStyle(user?.role)}`}>
                {formatRole(user?.role)}
              </span>
            </div>

            <span className="border-l border-odoo-border h-6"></span>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 border border-odoo-border hover:border-red-200 text-odoo-textPrimary hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-all-custom focus-ring"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Main Routing Content View */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
