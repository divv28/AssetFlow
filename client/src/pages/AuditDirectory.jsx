import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../services/api';
import DataTable from '../components/DataTable';
import { 
  Plus, Shield, Users, FileText, CheckCircle2, AlertTriangle, 
  Trash2, X, Search, Calendar, MapPin, Eye, FileSpreadsheet, Lock
} from 'lucide-react';

export const AuditDirectory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdminOrManager = ['ADMIN', 'ASSET_MANAGER'].includes(user?.role);

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Form States
  const [newName, setNewName] = useState('');
  const [newDeptId, setNewDeptId] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // Assign Auditors States
  const [selectedAuditorIds, setSelectedAuditorIds] = useState([]);
  const [auditorSearch, setAuditorSearch] = useState('');
  const [auditorDeptFilter, setAuditorDeptFilter] = useState('');

  // Verification Item States
  const [selectedItem, setSelectedItem] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState('VERIFIED');
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [verifyPhoto, setVerifyPhoto] = useState('');

  // Fetch audit cycles
  const { data: cyclesData, isLoading } = useQuery({
    queryKey: ['audit-cycles', searchQuery, statusFilter],
    queryFn: async () => {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/api/audit-cycles', { params });
      return res.data.data;
    },
  });

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments-list-audits'],
    queryFn: async () => {
      const res = await api.get('/api/departments');
      return res.data.data;
    },
  });

  // Fetch employees list for assigning
  const { data: employees } = useQuery({
    queryKey: ['employees-list-auditors', auditorSearch, auditorDeptFilter],
    queryFn: async () => {
      const params = { limit: 100 };
      if (auditorSearch) params.search = auditorSearch;
      if (auditorDeptFilter) params.departmentId = auditorDeptFilter;
      const res = await api.get('/api/employees', { params });
      return res.data.data;
    },
    enabled: isAssignOpen,
  });

  // Fetch items for currently selected audit cycle
  const { data: auditItems, refetch: refetchItems } = useQuery({
    queryKey: ['audit-items', selectedCycle?.id],
    queryFn: async () => {
      const res = await api.get(`/api/audit-cycles/${selectedCycle.id}/items`);
      return res.data.data;
    },
    enabled: !!selectedCycle,
  });

  // Fetch discrepancy report
  const { data: reportData } = useQuery({
    queryKey: ['audit-report', selectedCycle?.id],
    queryFn: async () => {
      const res = await api.get(`/api/audit-cycles/${selectedCycle.id}/report`);
      return res.data.data;
    },
    enabled: !!selectedCycle && isReportOpen,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/api/audit-cycles', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['audit-cycles']);
      setIsCreateOpen(false);
      resetCreateForm();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ cycleId, auditorIds }) => {
      const res = await api.post(`/api/audit-cycles/${cycleId}/assign`, { auditorIds });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['audit-cycles']);
      setIsAssignOpen(false);
      setSelectedAuditorIds([]);
    },
  });

  const verifyItemMutation = useMutation({
    mutationFn: async ({ itemId, payload }) => {
      const res = await api.patch(`/api/audit-cycles/items/${itemId}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      refetchItems();
      setSelectedItem(null);
      setVerifyRemarks('');
      setVerifyPhoto('');
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (cycleId) => {
      const res = await api.post(`/api/audit-cycles/${cycleId}/close`);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['audit-cycles']);
      setSelectedCycle(data);
    },
  });

  const resetCreateForm = () => {
    setNewName('');
    setNewDeptId('');
    setNewLocation('');
    setNewStartDate('');
    setNewEndDate('');
  };

  const handleCreateCycle = (e) => {
    e.preventDefault();
    createMutation.mutate({
      name: newName,
      departmentId: newDeptId || null,
      location: newLocation || null,
      startDate: newStartDate,
      endDate: newEndDate,
    });
  };

  const handleAssignAuditors = (e) => {
    e.preventDefault();
    assignMutation.mutate({
      cycleId: selectedCycle.id,
      auditorIds: selectedAuditorIds,
    });
  };

  const handleVerifyItem = (e) => {
    e.preventDefault();
    verifyItemMutation.mutate({
      itemId: selectedItem.id,
      payload: {
        status: verifyStatus,
        remarks: verifyRemarks || null,
        photo: verifyPhoto || null,
      },
    });
  };

  const handleAuditorToggle = (uuid) => {
    setSelectedAuditorIds((prev) =>
      prev.includes(uuid) ? prev.filter((id) => id !== uuid) : [...prev, uuid]
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CLOSED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const columns = [
    {
      header: 'Audit name',
      accessor: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-odoo-textPrimary block">{row.name}</span>
          <span className="text-[10px] text-gray-400 font-mono block">{row.uuid}</span>
        </div>
      ),
    },
    {
      header: 'Target Dept',
      accessor: 'department',
      render: (row) => (
        <span className="font-semibold text-odoo-textSecondary">
          {row.department?.name || 'All Departments'}
        </span>
      ),
    },
    {
      header: 'Location Scope',
      accessor: 'location',
      render: (row) => (
        <div className="flex items-center gap-1 text-odoo-textSecondary font-semibold">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          <span>{row.location || 'All Locations'}</span>
        </div>
      ),
    },
    {
      header: 'Audit Dates',
      accessor: 'startDate',
      render: (row) => (
        <span className="text-xs text-odoo-textSecondary">
          {new Date(row.startDate).toLocaleDateString()} to {new Date(row.endDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(row.status)}`}>
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          onClick={() => {
            setSelectedCycle(row);
            setIsVerifyOpen(true);
          }}
          className="text-primary hover:text-primary-hover font-bold text-xs flex items-center gap-1"
        >
          <Eye className="w-4 h-4" />
          <span>Verify / Inspect</span>
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Asset Audits"
      breadcrumbs={[{ label: 'Home', path: '/dashboard' }, { label: 'Audit Cycles' }]}
    >
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 border border-odoo-border rounded-xl shadow-sm">
          <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search audit cycle name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-odoo-border bg-white rounded-lg text-xs font-semibold placeholder-gray-400 focus-ring"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 border border-odoo-border bg-white rounded-lg text-xs font-semibold focus-ring"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {isAdminOrManager && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Audit Cycle</span>
            </button>
          )}
        </div>

        {/* Audit listings table */}
        <div className="bg-white border border-odoo-border rounded-xl shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={cyclesData || []}
            isLoading={isLoading}
            emptyMessage="No audit cycles schedule found matching parameters."
          />
        </div>

        {/* CREATE AUDIT CYCLE RIGHT DRAWER */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)}></div>
            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between border-l border-odoo-border animate-slide-left z-10">
              <div className="p-6 border-b border-odoo-border flex items-center justify-between shrink-0">
                <h3 className="font-extrabold text-odoo-textPrimary flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Shield className="w-5 h-5 text-primary" />
                  Schedule Audit Cycle
                </h3>
                <button onClick={() => setIsCreateOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCycle} className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-odoo-textSecondary block">Audit Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Annual IT Assets Audit Q3"
                    className="w-full px-3.5 py-2.5 border border-odoo-border rounded-lg text-xs font-semibold focus-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-odoo-textSecondary block">Target Department</label>
                  <select
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-odoo-border bg-white rounded-lg text-xs font-semibold focus-ring"
                  >
                    <option value="">All Departments (Global Audit)</option>
                    {departments?.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-odoo-textSecondary block">Location Constraint</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Head Office 4th Floor"
                    className="w-full px-3.5 py-2.5 border border-odoo-border rounded-lg text-xs font-semibold focus-ring"
                  />
                  <p className="text-[10px] text-gray-400">Restricts the snapshot to assets located in this area.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-odoo-textSecondary block">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-odoo-border rounded-lg text-xs font-semibold focus-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-odoo-textSecondary block">End Date *</label>
                    <input
                      type="date"
                      required
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-odoo-border rounded-lg text-xs font-semibold focus-ring"
                    />
                  </div>
                </div>
              </form>

              <div className="p-6 border-t border-odoo-border flex gap-3 shrink-0 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 border border-odoo-border text-odoo-textPrimary font-bold rounded-lg text-xs hover:bg-gray-100 transition-colors focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleCreateCycle}
                  disabled={createMutation.isLoading}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-primary-light text-white font-extrabold rounded-lg text-xs shadow-md transition-colors focus-ring"
                >
                  {createMutation.isLoading ? 'Scheduling...' : 'Create Cycle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VERIFY / INSPECT DIALOG DRAWER */}
        {isVerifyOpen && selectedCycle && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsVerifyOpen(false)}></div>
            <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-odoo-border animate-slide-left z-10">
              <div className="p-6 border-b border-odoo-border flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-extrabold text-odoo-textPrimary text-sm uppercase tracking-wider">
                    {selectedCycle.name} Detail
                  </h3>
                  <span className={`text-[9px] font-bold px-2 py-0.5 mt-1 rounded-full border uppercase tracking-wider inline-block ${getStatusBadge(selectedCycle.status)}`}>
                    {selectedCycle.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {isAdminOrManager && selectedCycle.status === 'DRAFT' && (
                    <button
                      onClick={() => setIsAssignOpen(true)}
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      <span>Assign Auditors</span>
                    </button>
                  )}

                  {isAdminOrManager && selectedCycle.status === 'ACTIVE' && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to CLOSE this audit cycle? This updates missing assets to LOST and damaged assets will auto-create maintenance logs.')) {
                          closeMutation.mutate(selectedCycle.id);
                        }
                      }}
                      disabled={closeMutation.isLoading}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{closeMutation.isLoading ? 'Closing...' : 'Close Audit'}</span>
                    </button>
                  )}

                  {selectedCycle.status === 'CLOSED' && (
                    <button
                      onClick={() => setIsReportOpen(true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Discrepancy Report</span>
                    </button>
                  )}

                  <button onClick={() => setIsVerifyOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Items checklist view */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 border border-odoo-border rounded-xl">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Target Dept</span>
                    <span className="text-xs font-bold text-odoo-textPrimary">{selectedCycle.department?.name || 'All Departments'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Location Scope</span>
                    <span className="text-xs font-bold text-odoo-textPrimary">{selectedCycle.location || 'All Locations'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Assigned Auditors</span>
                    <span className="text-xs font-bold text-odoo-textPrimary block truncate">
                      {selectedCycle.assignments?.map((a) => a.auditor.name).join(', ') || 'No auditor assigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Snapshot Assets</span>
                    <span className="text-xs font-bold text-odoo-textPrimary">{selectedCycle._count?.items || 0}</span>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-odoo-textSecondary uppercase tracking-wider border-b border-odoo-border pb-2 mt-4">
                  Checklist Snapshot Items
                </h4>

                <div className="divide-y divide-odoo-border text-xs">
                  {auditItems?.map((item) => {
                    let badgeColor = 'bg-gray-100 text-gray-700';
                    if (item.status === 'VERIFIED') badgeColor = 'bg-green-100 text-green-700 border-green-200';
                    if (item.status === 'MISSING') badgeColor = 'bg-red-100 text-red-700 border-red-200';
                    if (item.status === 'DAMAGED') badgeColor = 'bg-orange-100 text-orange-700 border-orange-200';

                    return (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-odoo-textPrimary truncate">{item.asset.name}</span>
                            <span className="text-[9px] font-mono bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded border">
                              {item.asset.assetTag}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-gray-400 mt-0.5">Location: {item.asset.location || 'N/A'}</p>
                          {item.remarks && (
                            <p className="text-[10px] text-orange-600 mt-1 italic font-semibold">Remarks: {item.remarks}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border uppercase ${badgeColor}`}>
                            {item.status}
                          </span>

                          {selectedCycle.status === 'ACTIVE' && (
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setVerifyStatus(item.status !== 'NOT_VERIFIED' ? item.status : 'VERIFIED');
                                setVerifyRemarks(item.remarks || '');
                                setVerifyPhoto(item.photo || '');
                              }}
                              className="text-xs text-primary hover:underline font-bold"
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT ITEM VERIFICATION SUB-DIALOG FORM */}
        {selectedItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedItem(null)}></div>
            <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-6 border border-odoo-border space-y-4 animate-scale z-10">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-odoo-textPrimary">
                  Verify Asset: {selectedItem.asset.name}
                </h4>
                <button onClick={() => setSelectedItem(null)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleVerifyItem} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-odoo-textSecondary">Verification Status *</label>
                  <select
                    value={verifyStatus}
                    onChange={(e) => setVerifyStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-odoo-border bg-white rounded-lg font-semibold focus-ring"
                  >
                    <option value="VERIFIED">Verified (Condition Good)</option>
                    <option value="MISSING">Missing (Unlocatable / Lost)</option>
                    <option value="DAMAGED">Damaged (Requires Maintenance)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-odoo-textSecondary">Remarks & Notes</label>
                  <textarea
                    value={verifyRemarks}
                    onChange={(e) => setVerifyRemarks(e.target.value)}
                    placeholder="Enter audit check notes, missing reports, or condition remarks..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 border border-odoo-border rounded-lg font-semibold focus-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-odoo-textSecondary">Photo URL link</label>
                  <input
                    type="text"
                    value={verifyPhoto}
                    onChange={(e) => setVerifyPhoto(e.target.value)}
                    placeholder="https://example.com/damaged-photo.jpg"
                    className="w-full px-3.5 py-2.5 border border-odoo-border rounded-lg font-semibold focus-ring"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 py-2.5 border border-odoo-border text-odoo-textPrimary font-bold rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary text-white font-extrabold rounded-lg text-xs"
                  >
                    Save verification
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ASSIGN AUDITORS MODAL SUB-DIALOG */}
        {isAssignOpen && selectedCycle && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsAssignOpen(false)}></div>
            <div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 border border-odoo-border flex flex-col max-h-[80vh] z-10">
              <div className="flex items-center justify-between shrink-0 mb-4">
                <h4 className="text-sm font-extrabold text-odoo-textPrimary flex items-center gap-1.5">
                  <Users className="w-5 h-5 text-primary" />
                  Assign Auditors to Cycle
                </h4>
                <button onClick={() => setIsAssignOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-4 shrink-0">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <input
                    type="text"
                    placeholder="Search employee name..."
                    value={auditorSearch}
                    onChange={(e) => setAuditorSearch(e.target.value)}
                    className="px-3 py-2 border border-odoo-border rounded-lg focus-ring"
                  />
                  <select
                    value={auditorDeptFilter}
                    onChange={(e) => setAuditorDeptFilter(e.target.value)}
                    className="px-3 py-2 border border-odoo-border bg-white rounded-lg focus-ring font-semibold"
                  >
                    <option value="">All Departments</option>
                    {departments?.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-odoo-border text-xs pr-1">
                {employees?.map((emp) => (
                  <div
                    key={emp.uuid}
                    onClick={() => handleAuditorToggle(emp.uuid)}
                    className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg mt-0.5 transition-colors ${
                      selectedAuditorIds.includes(emp.uuid) ? 'bg-primary-light/10 border border-primary/20' : ''
                    }`}
                  >
                    <div>
                      <span className="font-bold text-odoo-textPrimary">{emp.name}</span>
                      <span className="text-[10px] text-gray-400 block font-mono">{emp.email}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedAuditorIds.includes(emp.uuid)}
                      onChange={() => {}} // handled by wrapper div click
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-odoo-border shrink-0 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="flex-1 py-2.5 border border-odoo-border text-odoo-textPrimary font-bold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignAuditors}
                  disabled={assignMutation.isLoading || selectedAuditorIds.length === 0}
                  className="flex-1 py-2.5 bg-primary disabled:bg-primary-light text-white font-extrabold rounded-lg text-xs shadow-md"
                >
                  {assignMutation.isLoading ? 'Assigning...' : `Assign ${selectedAuditorIds.length} Auditor(s)`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DISCREPANCY REPORT TIMELINE VIEW */}
        {isReportOpen && reportData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsReportOpen(false)}></div>
            <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col h-[90vh] border border-odoo-border z-10 overflow-hidden">
              
              <div className="p-6 border-b border-odoo-border flex items-center justify-between shrink-0 bg-gray-50">
                <div>
                  <h3 className="font-extrabold text-odoo-textPrimary text-sm uppercase tracking-wider">
                    Discrepancy Audit Report
                  </h3>
                  <span className="text-xs text-odoo-textSecondary">Cycle: {reportData.cycleName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Print PDF</span>
                  </button>
                  <button onClick={() => setIsReportOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-odoo-textSecondary" id="print-area">
                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-odoo-bg border border-odoo-border p-4 rounded-xl text-center">
                    <span className="text-[10px] text-gray-400 font-bold block">Total Items</span>
                    <span className="text-xl font-black text-odoo-textPrimary">{reportData.summary.totalItems}</span>
                  </div>
                  <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-green-600 font-bold block">Verified Good</span>
                    <span className="text-xl font-black text-green-700">{reportData.summary.verifiedCount}</span>
                  </div>
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-red-600 font-bold block">Missing (Lost)</span>
                    <span className="text-xl font-black text-red-700">{reportData.summary.missingCount}</span>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-orange-600 font-bold block">Damaged reported</span>
                    <span className="text-xl font-black text-orange-700">{reportData.summary.damagedCount}</span>
                  </div>
                  <div className="bg-gray-50 border border-odoo-border p-4 rounded-xl text-center">
                    <span className="text-[10px] text-gray-400 font-bold block">Unverified</span>
                    <span className="text-xl font-black text-gray-600">{reportData.summary.unverifiedCount}</span>
                  </div>
                </div>

                {/* Audit details metadata */}
                <div className="border border-odoo-border rounded-xl p-4 bg-white space-y-2">
                  <p><strong>Department scope:</strong> {reportData.department}</p>
                  <p><strong>Auditors:</strong> {reportData.auditors.join(', ') || 'No auditors recorded.'}</p>
                  <p><strong>Start Date:</strong> {new Date(reportData.startDate).toLocaleDateString()}</p>
                  <p><strong>Reviewer:</strong> {reportData.closedBy || 'Pending closure'}</p>
                </div>

                {/* Missing assets table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4.5 h-4.5" />
                    Missing Assets Discrepancies
                  </h4>
                  <div className="border border-odoo-border rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-odoo-border text-left">
                      <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-odoo-textSecondary">
                        <tr>
                          <th className="px-4 py-2.5">Asset tag</th>
                          <th className="px-4 py-2.5">Asset name</th>
                          <th className="px-4 py-2.5">Last location</th>
                          <th className="px-4 py-2.5">Audit remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-odoo-border bg-white">
                        {reportData.missingAssets.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-center text-gray-400 italic">No missing assets reported.</td>
                          </tr>
                        ) : (
                          reportData.missingAssets.map((asset, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 font-mono text-odoo-textPrimary">{asset.tag}</td>
                              <td className="px-4 py-3 font-semibold text-odoo-textPrimary">{asset.name}</td>
                              <td className="px-4 py-3">{asset.location || 'N/A'}</td>
                              <td className="px-4 py-3 text-red-600 font-semibold">{asset.remarks || 'No remarks'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Damaged assets table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-4.5 h-4.5" />
                    Damaged Assets Discrepancies (Maintenance Requested)
                  </h4>
                  <div className="border border-odoo-border rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-odoo-border text-left">
                      <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-odoo-textSecondary">
                        <tr>
                          <th className="px-4 py-2.5">Asset tag</th>
                          <th className="px-4 py-2.5">Asset name</th>
                          <th className="px-4 py-2.5">Last location</th>
                          <th className="px-4 py-2.5">Condition Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-odoo-border bg-white">
                        {reportData.damagedAssets.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-center text-gray-400 italic">No damaged assets reported.</td>
                          </tr>
                        ) : (
                          reportData.damagedAssets.map((asset, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 font-mono text-odoo-textPrimary">{asset.tag}</td>
                              <td className="px-4 py-3 font-semibold text-odoo-textPrimary">{asset.name}</td>
                              <td className="px-4 py-3">{asset.location || 'N/A'}</td>
                              <td className="px-4 py-3 text-orange-600 font-semibold">{asset.remarks || 'No remarks'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default AuditDirectory;
