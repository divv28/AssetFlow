import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, Layers, Settings, Database, Calendar, 
  Wrench, ShieldCheck, FileText, Bell, ChevronRight, Menu, X, Shield 
} from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../services/api';

export const DashboardLayout = ({ children, title = '', breadcrumbs = [] }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial notifications
  const loadNotifications = async () => {
    try {
      const res = await api.get('/api/notifications?limit=5');
      setNotifications(res.data.data || []);
      
      const unreadRes = await api.get('/api/notifications?read=false&limit=100');
      setUnreadCount(unreadRes.data.pagination?.total || 0);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  useEffect(() => {
    if (user?.uuid) {
      loadNotifications();

      // Initialize Socket.IO connection
      const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        withCredentials: true,
      });

      // Register client
      socket.emit('register', user.uuid);

      // Listen for notification
      socket.on('notification', (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);
        setUnreadCount((c) => c + 1);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
    } catch (e) {
      console.error('Failed to mark all read', e);
    }
  };

  const handleNotifClick = async (notif) => {
    try {
      if (!notif.read) {
        await api.patch(`/api/notifications/${notif.id}/read`);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true, isRead: true } : n))
        );
      }
      setIsNotifOpen(false);
      if (notif.link) {
        navigate(notif.link);
      }
    } catch (e) {
      console.error('Failed to process notification click', e);
    }
  };

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
    { label: 'Allocation & Transfer', path: '/allocations', icon: ShieldCheck, enabled: true },
    { label: 'Resource Booking', path: '/resource-booking', icon: Calendar, enabled: true },
    { label: 'Maintenance', path: '/maintenance', icon: Wrench, enabled: true },
    { label: 'Audit', path: '/audits', icon: Shield, enabled: true },
    { label: 'Activity Logs', path: '/activity-logs', icon: FileText, enabled: isAdmin },
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

            {/* Notification Bell Dropdown */}
            <div className="relative flex items-center" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-gray-500 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors focus-ring"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 top-10 w-80 bg-white border border-odoo-border rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-odoo-border">
                  {/* Dropdown Header */}
                  <div className="p-3 bg-gray-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-odoo-textPrimary">Recent Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-primary hover:underline font-bold"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-odoo-border">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-odoo-textSecondary">
                        No new notifications.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={`p-3 text-left hover:bg-gray-50 cursor-pointer transition-colors space-y-1 ${
                            !notif.read ? 'bg-primary-light/10 font-medium' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className={`text-[10.5px] font-bold ${
                              !notif.read ? 'text-primary' : 'text-odoo-textPrimary'
                            }`}>
                              {notif.title}
                            </span>
                            <span className="text-[9px] text-gray-400 shrink-0 mt-0.5">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-odoo-textSecondary leading-normal">
                            {notif.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-2.5 text-center bg-gray-50">
                    <span className="text-[10.5px] text-gray-400 italic">Connected to Live Notification Feed</span>
                  </div>
                </div>
              )}
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
