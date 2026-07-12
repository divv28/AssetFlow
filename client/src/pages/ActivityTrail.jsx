import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../services/api';
import DataTable from '../components/DataTable';
import { 
  FileText, Clock, User, Globe, Laptop, Search, 
  Eye, X, ArrowRight, FileSpreadsheet
} from 'lucide-react';

export const ActivityTrail = () => {
  const { user } = useAuth();

  // Search & Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  // Fetch activity logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['activity-logs', searchQuery, moduleFilter, actionFilter, startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (moduleFilter) params.module = moduleFilter;
      if (actionFilter) params.action = actionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get('/api/activity', { params });
      return res.data.data;
    },
  });

  const getActionColor = (action) => {
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50 border-green-200';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50 border-red-200';
    if (action.includes('UPDATE')) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-primary bg-primary-light/10 border-primary/20';
  };

  const handleExportCSV = () => {
    if (!logsData || logsData.length === 0) return;
    
    const headers = ['Time', 'User', 'Module', 'Action', 'Entity ID', 'IP Address', 'Browser/User-Agent'];
    const rows = logsData.map((log) => [
      new Date(log.createdAt).toLocaleString(),
      log.user?.name || 'System',
      log.module,
      log.action,
      log.entityId || 'N/A',
      log.ipAddress || 'N/A',
      log.browser || 'N/A',
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `activity_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      header: 'Time stamp',
      accessor: 'createdAt',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-odoo-textSecondary">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>{new Date(row.createdAt).toLocaleString()}</span>
        </div>
      ),
    },
    {
      header: 'User',
      accessor: 'user',
      render: (row) => (
        <div>
          <span className="font-bold text-odoo-textPrimary block">{row.user?.name || 'System'}</span>
          <span className="text-[10px] text-gray-400 block">{row.user?.email || 'automated@system.com'}</span>
        </div>
      ),
    },
    {
      header: 'Module',
      accessor: 'module',
      render: (row) => (
        <span className="font-semibold text-odoo-textSecondary">{row.module}</span>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (row) => (
        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getActionColor(row.action)}`}>
          {row.action.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'IP Address',
      accessor: 'ipAddress',
      render: (row) => (
        <div className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold font-mono">
          <Globe className="w-3 h-3 text-gray-300" />
          <span>{row.ipAddress || '127.0.0.1'}</span>
        </div>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          onClick={() => setSelectedLog(row)}
          className="text-primary hover:text-primary-hover font-bold text-xs flex items-center gap-1"
        >
          <Eye className="w-4 h-4" />
          <span>View Details</span>
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Security Activity Trail"
      breadcrumbs={[{ label: 'Home', path: '/dashboard' }, { label: 'Audit Trail logs' }]}
    >
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Filters control pane */}
        <div className="bg-white p-5 border border-odoo-border rounded-xl shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
            <div className="space-y-1">
              <label className="text-odoo-textSecondary">Search target</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="User, module, action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-odoo-border rounded-lg focus-ring"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-odoo-textSecondary">Module Scope</label>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-odoo-border bg-white rounded-lg focus-ring"
              >
                <option value="">All Modules</option>
                <option value="User">Employee / User</option>
                <option value="Asset">Asset</option>
                <option value="Allocation">Allocation</option>
                <option value="TransferRequest">Transfer Request</option>
                <option value="ReturnRequest">Return Request</option>
                <option value="Booking">Resource Booking</option>
                <option value="MaintenanceRequest">Maintenance</option>
                <option value="Department">Department</option>
                <option value="AuditCycle">Audit Cycle</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-odoo-textSecondary">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-odoo-border rounded-lg focus-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-odoo-textSecondary">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-odoo-border rounded-lg focus-ring"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleExportCSV}
              disabled={!logsData || logsData.length === 0}
              className="px-4 py-2 border border-odoo-border hover:bg-gray-50 text-odoo-textPrimary text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span>Export CSV Audit Trail</span>
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white border border-odoo-border rounded-xl shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={logsData || []}
            isLoading={isLoading}
            emptyMessage="No activity log records found matching the specifications."
          />
        </div>

        {/* LOG DETAILS SIDE DRAWER & SIDE-BY-SIDE JSON COMPARISON */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLog(null)}></div>
            <div className="relative w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-odoo-border animate-slide-left z-10">
              
              <div className="p-6 border-b border-odoo-border flex items-center justify-between shrink-0">
                <h3 className="font-extrabold text-odoo-textPrimary text-sm uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Audit Log Details
                </h3>
                <button onClick={() => setSelectedLog(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-odoo-textSecondary">
                
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 border border-odoo-border rounded-xl">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Action Actioned</span>
                    <span className="font-bold text-odoo-textPrimary">{selectedLog.action.replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Module</span>
                    <span className="font-bold text-odoo-textPrimary">{selectedLog.module}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Executor Name</span>
                    <span className="font-bold text-odoo-textPrimary">{selectedLog.user?.name || 'System'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">IP Address</span>
                    <span className="font-mono text-odoo-textPrimary">{selectedLog.ipAddress || '127.0.0.1'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Browser User Agent</span>
                    <span className="text-xs text-odoo-textPrimary font-semibold">{selectedLog.browser || 'N/A'}</span>
                  </div>
                  {selectedLog.entityId && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Target Entity UUID</span>
                      <span className="font-mono text-[10.5px] text-primary font-bold">{selectedLog.entityId}</span>
                    </div>
                  )}
                </div>

                {/* JSON Diffs Viewer */}
                <div className="space-y-4">
                  <h4 className="font-bold text-odoo-textSecondary uppercase tracking-wider border-b border-odoo-border pb-2">
                    Record State Payload Comparison
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Old Value */}
                    <div className="space-y-2">
                      <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 text-[10px] uppercase">
                        Old Value state
                      </span>
                      <pre className="bg-gray-900 text-green-400 font-mono text-[11px] p-4 rounded-xl border border-gray-800 overflow-x-auto max-h-80 shadow-inner">
                        {selectedLog.oldValue 
                          ? JSON.stringify(selectedLog.oldValue, null, 2)
                          : '// No previous record value'
                        }
                      </pre>
                    </div>

                    {/* New Value */}
                    <div className="space-y-2">
                      <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 text-[10px] uppercase flex items-center gap-1">
                        <span>New Value state</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                      <pre className="bg-gray-900 text-green-400 font-mono text-[11px] p-4 rounded-xl border border-gray-800 overflow-x-auto max-h-80 shadow-inner">
                        {selectedLog.newValue 
                          ? JSON.stringify(selectedLog.newValue, null, 2)
                          : '// Record was deleted'
                        }
                      </pre>
                    </div>
                  </div>
                </div>

              </div>

              <div className="p-6 border-t border-odoo-border shrink-0 bg-gray-50 flex">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Close Inspectors Panel
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default ActivityTrail;
