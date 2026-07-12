import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

import DashboardLayout from '../layouts/DashboardLayout';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

import { 
  ShieldCheck, User, Users, Calendar, Clock, AlertTriangle, 
  Plus, Search, SlidersHorizontal, ArrowLeftRight, CornerDownLeft, 
  History, Printer, FileText, CheckCircle2, ChevronRight, FileUp, Info 
} from 'lucide-react';

export const AllocationsDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';
  const isDeptHead = user?.role === 'DEPARTMENT_HEAD';
  const isEmployee = user?.role === 'EMPLOYEE';
  const canAllocate = isAdminOrManager || isDeptHead;

  // Search & Params
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page')) || 1;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Local Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [empFilter, setEmpFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // UI Open States
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  // Direct Actions Form Modals
  const [activeActionsDropdown, setActiveActionsDropdown] = useState(null);
  
  // Transfer Modal State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferTargetEmployeeId, setTransferTargetEmployeeId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Return Modal State
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnPhoto, setReturnPhoto] = useState(null);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Allocate Drawer Form State
  const [allocateAssetId, setAllocateAssetId] = useState('');
  const [allocateEmployeeId, setAllocateEmployeeId] = useState('');
  const [allocateDepartmentId, setAllocateDepartmentId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [conditionAtAllocation, setConditionAtAllocation] = useState('NEW');
  const [remarks, setRemarks] = useState('');

  // Debouncer
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setSearchParams({ page: '1' });
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Dashboard Stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/api/employees/dashboard-stats');
      return res.data.data;
    },
  });

  // Fetch departments & categories
  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await api.get('/api/departments', { params: { limit: 100, status: 'ACTIVE' } });
      return res.data.data;
    },
  });

  // Fetch active employees — scope to dept for DEPARTMENT_HEAD
  const { data: employees } = useQuery({
    queryKey: ['employees-all-list', user?.role, user?.departmentId],
    queryFn: async () => {
      const params = { limit: 100, status: 'ACTIVE' };
      if (isDeptHead && user?.departmentId) {
        params.departmentId = user.departmentId;
      }
      const res = await api.get('/api/employees', { params });
      return res.data.data;
    },
  });

  // Fetch available assets for direct allocation — scope to dept for DEPARTMENT_HEAD
  const { data: availableAssets } = useQuery({
    queryKey: ['available-assets-list', user?.role, user?.departmentId],
    queryFn: async () => {
      const params = { limit: 100, status: 'AVAILABLE' };
      if (isDeptHead && user?.departmentId) {
        params.departmentId = user.departmentId;
      }
      const res = await api.get('/api/assets', { params });
      return res.data.data;
    },
    enabled: isAllocateOpen,
  });

  // Fetch Allocations List
  const { data: allocationsData, isLoading } = useQuery({
    queryKey: ['allocations', page, debouncedSearch, statusFilter, deptFilter, empFilter, startDate, endDate],
    queryFn: async () => {
      const params = {
        page,
        limit: 10,
        search: debouncedSearch,
        status: statusFilter,
        departmentId: deptFilter,
        employeeId: empFilter,
        startDate,
        endDate,
      };
      const res = await api.get('/api/allocations', { params });
      return res.data;
    },
  });

  // Direct Allocation Submit
  const allocateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/api/allocations', payload);
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Asset allocated successfully!');
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsAllocateOpen(false);
      resetAllocateForm();
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to allocate asset');
    },
  });

  // Transfer Mutation
  const transferMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/api/allocations/transfers', payload);
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Transfer request submitted successfully. Target Allocation status is pending.');
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsTransferOpen(false);
      setTransferTarget(null);
      setTransferTargetEmployeeId('');
      setTransferReason('');
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to submit transfer request');
    },
  });

  // Sync direct allocate department when employee changes
  useEffect(() => {
    if (allocateEmployeeId && employees) {
      const selected = employees.find(e => e.uuid === allocateEmployeeId);
      if (selected?.departmentId) {
        setAllocateDepartmentId(selected.departmentId);
      }
    }
  }, [allocateEmployeeId, employees]);

  const resetAllocateForm = () => {
    setAllocateAssetId('');
    setAllocateEmployeeId('');
    setAllocateDepartmentId('');
    setExpectedReturnDate('');
    setConditionAtAllocation('NEW');
    setRemarks('');
  };

  const handleAllocateSubmit = (e) => {
    e.preventDefault();
    if (!allocateAssetId || !allocateEmployeeId || !allocateDepartmentId) {
      addToast('error', 'Please fill in all required fields');
      return;
    }
    allocateMutation.mutate({
      assetId: allocateAssetId,
      employeeId: allocateEmployeeId,
      departmentId: allocateDepartmentId,
      expectedReturnDate: expectedReturnDate || null,
      conditionAtAllocation,
      remarks,
    });
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingReturn(true);

    const formData = new FormData();
    formData.append('allocationId', returnTarget.id);
    formData.append('condition', returnCondition);
    if (returnNotes) formData.append('notes', returnNotes);
    if (returnPhoto) formData.append('file', returnPhoto);

    try {
      await api.post('/api/allocations/returns', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addToast('success', 'Return request raised successfully');
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsReturnOpen(false);
      setReturnTarget(null);
      setReturnNotes('');
      setReturnPhoto(null);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Failed to submit return request');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const formattedStats = [
    { label: 'Active Allocations', value: stats?.activeAllocations || 0, icon: ShieldCheck, color: 'text-primary bg-primary-light/10 border-primary/20' },
    { label: 'Pending Transfers', value: stats?.pendingTransfers || 0, icon: ArrowLeftRight, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    { label: 'Overdue Returns', value: stats?.overdueReturns || 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50 border-red-200' },
    { label: 'Assets Due Today', value: stats?.assetsDueToday || 0, icon: Calendar, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  ];

  const tableColumns = [
    {
      header: 'Asset Specifications',
      accessor: (row) => (
        <div>
          <span className="font-bold text-odoo-textPrimary block">{row.asset.name}</span>
          <span className="font-mono text-[10px] bg-primary-light/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded">
            {row.asset.assetTag}
          </span>
        </div>
      ),
    },
    {
      header: 'Employee Holder',
      accessor: (row) => (
        <div>
          <span className="font-bold text-odoo-textPrimary block">{row.employee.name}</span>
          <span className="text-[10px] text-odoo-textSecondary block">{row.employee.email}</span>
        </div>
      ),
    },
    {
      header: 'Department Snapshot',
      accessor: (row) => (
        <span className="font-semibold text-xs text-odoo-textSecondary">
          {row.department.name} ({row.department.code})
        </span>
      ),
    },
    {
      header: 'Allocated Date',
      accessor: (row) => <span className="text-xs">{new Date(row.allocatedDate).toLocaleDateString()}</span>,
    },
    {
      header: 'Expected Return',
      accessor: (row) => (
        <span className={`text-xs ${row.isOverdue ? 'text-red-600 font-bold' : ''}`}>
          {row.expectedReturnDate ? new Date(row.expectedReturnDate).toLocaleDateString() : 'Global Policy (No limit)'}
        </span>
      ),
    },
    {
      header: 'Allocation Status',
      accessor: (row) => {
        let type = 'neutral';
        if (row.status === 'ACTIVE') type = 'success';
        if (row.status === 'TRANSFER_PENDING') type = 'warning';
        if (row.status === 'OVERDUE' || row.isOverdue) type = 'danger';
        return <StatusBadge type={type} label={row.isOverdue ? 'OVERDUE' : row.status} />;
      },
    },
    {
      header: 'Actions',
      accessor: (row) => {
        const isOpen = activeActionsDropdown === row.id;
        const isActiveOrOverdue = row.status === 'ACTIVE' || row.status === 'OVERDUE';
        const isSelfAllocated = row.employeeId === user?.uuid;

        return (
          <div className="relative">
            <button
              onClick={() => setActiveActionsDropdown(isOpen ? null : row.id)}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-odoo-textSecondary" />
            </button>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setActiveActionsDropdown(null)}></div>
                <div className="absolute right-0 mt-1 w-44 bg-white border border-odoo-border rounded-xl shadow-lg z-20 py-1 overflow-hidden divide-y divide-odoo-border text-xs">
                  <div>
                    <button
                      onClick={() => {
                        navigate(`/assets/${row.assetId}`);
                        setActiveActionsDropdown(null);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-odoo-bg flex items-center gap-2 text-odoo-textPrimary"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Asset Specifications
                    </button>
                  </div>
                  {isActiveOrOverdue && (
                    <div>
                      {/* Admins, managers, dept heads, and the self-holder can request transfer */}
                      {(isAdminOrManager || isDeptHead || isSelfAllocated) && (
                        <button
                          onClick={() => {
                            setTransferTarget(row);
                            setIsTransferOpen(true);
                            setActiveActionsDropdown(null);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-odoo-bg flex items-center gap-2 text-primary font-semibold"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
                          Request Transfer
                        </button>
                      )}
                      {/* Admins, managers, dept heads, and self holder can return */}
                      {(isAdminOrManager || isDeptHead || isSelfAllocated) && (
                        <button
                          onClick={() => {
                            setReturnTarget(row);
                            setIsReturnOpen(true);
                            setActiveActionsDropdown(null);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-odoo-bg flex items-center gap-2 text-orange-600 font-semibold"
                        >
                          <CornerDownLeft className="w-3.5 h-3.5 text-orange-600" />
                          Request Return
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout
      title="Asset Allocation & Transfer"
      breadcrumbs={[{ label: 'Home', path: '/dashboard' }, { label: 'Allocation & Transfer' }]}
    >
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Tabs Header */}
        <div className="border-b border-odoo-border flex gap-4 overflow-x-auto shrink-0 bg-white p-2 rounded-lg border">
          <Link to="/allocations" className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-white shadow-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Allocation Dashboard</span>
          </Link>
          <Link to="/allocations/transfers" className="px-4 py-2 rounded-lg text-xs font-bold text-odoo-textSecondary hover:bg-gray-50 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transfer Requests</span>
          </Link>
          <Link to="/allocations/returns" className="px-4 py-2 rounded-lg text-xs font-bold text-odoo-textSecondary hover:bg-gray-50 flex items-center gap-2">
            <CornerDownLeft className="w-4 h-4" />
            <span>Return Requests</span>
          </Link>
          <Link to="/allocations/history" className="px-4 py-2 rounded-lg text-xs font-bold text-odoo-textSecondary hover:bg-gray-50 flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>Allocation History</span>
          </Link>
        </div>

        {/* Dashboard Statistics Panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {formattedStats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-white border border-odoo-border rounded-card p-5 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-xs text-odoo-textSecondary font-semibold block">{item.label}</span>
                  <span className="text-2xl font-black text-odoo-textPrimary">{item.value}</span>
                </div>
                <div className={`p-3.5 rounded-xl border ${item.color}`}>
                  <Icon className="w-5.5 h-5.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* List Operations panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-lg">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search holder name, asset specifications, tag, serial number..."
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAdvancedOpen(true)}
              className="px-4 py-2.5 bg-white border border-odoo-border text-odoo-textPrimary font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span>Filter Options</span>
            </button>

            {canAllocate && (
              <button
                onClick={() => setIsAllocateOpen(true)}
                className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-sm flex items-center gap-2 transition-all-custom shadow-md"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Allocate Asset</span>
              </button>
            )}
          </div>
        </div>

        {/* Allocations Table */}
        <div className="bg-white border border-odoo-border rounded-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton rows={5} />
            </div>
          ) : (
            <DataTable
              columns={tableColumns}
              data={allocationsData?.data || []}
              pagination={allocationsData?.meta}
              onPageChange={(p) => setSearchParams({ page: String(p) })}
            />
          )}
        </div>

      </div>

      {/*Direct Allocate Drawer */}
      <Drawer
        isOpen={isAllocateOpen}
        onClose={() => { setIsAllocateOpen(false); resetAllocateForm(); }}
        title="Direct Allocate Asset"
      >
        <form onSubmit={handleAllocateSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Select Available Asset *</label>
            <select
              value={allocateAssetId}
              onChange={(e) => setAllocateAssetId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
              required
            >
              <option value="">Select Asset</option>
              {availableAssets?.map(ass => (
                <option key={ass.id} value={ass.id}>
                  {ass.name} ({ass.assetTag})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Select Employee Holder *</label>
            <select
              value={allocateEmployeeId}
              onChange={(e) => setAllocateEmployeeId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
              required
            >
              <option value="">Select Employee</option>
              {employees?.map(emp => (
                <option key={emp.uuid} value={emp.uuid}>
                  {emp.name} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Department Snapshot *</label>
            <select
              value={allocateDepartmentId}
              onChange={(e) => setAllocateDepartmentId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
              required
            >
              <option value="">Select Department</option>
              {departments?.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-gray-400 mt-1 block">Preserved for historical reports. Auto-filled from employee settings.</span>
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Condition at Allocation</label>
            <select
              value={conditionAtAllocation}
              onChange={(e) => setConditionAtAllocation(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            >
              <option value="NEW">New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
              <option value="DAMAGED">Damaged</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Expected Return Date</label>
            <input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            />
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Remarks / Notes</label>
            <textarea
              rows="3"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            ></textarea>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => { setIsAllocateOpen(false); resetAllocateForm(); }}
              className="flex-1 py-2 border border-odoo-border rounded-lg text-sm font-bold text-odoo-textPrimary hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={allocateMutation.isPending}
              className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
            >
              Allocate Now
            </button>
          </div>
        </form>
      </Drawer>

      {/* Filter Drawer */}
      <Drawer
        isOpen={isAdvancedOpen}
        onClose={() => setIsAdvancedOpen(false)}
        title="Advanced Allocation Filters"
      >
        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1 uppercase">Allocation Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE (In Use)</option>
              <option value="TRANSFER_PENDING">TRANSFER_PENDING (Moving)</option>
              <option value="OVERDUE">OVERDUE</option>
              <option value="RETURNED">RETURNED (Closed)</option>
            </select>
          </div>

          {user?.role !== 'DEPARTMENT_HEAD' && (
            <div>
              <label className="block font-bold text-odoo-textSecondary mb-1 uppercase">Department</label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              >
                <option value="">All Departments</option>
                {departments?.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1 uppercase">Allocated Holder (Employee)</label>
            <select
              value={empFilter}
              onChange={(e) => setEmpFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            >
              <option value="">All Employees</option>
              {employees?.map(emp => (
                <option key={emp.uuid} value={emp.uuid}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1 uppercase">Date Range Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            />
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1 uppercase">Date Range End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => {
                setStatusFilter('');
                setDeptFilter('');
                setEmpFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="flex-1 py-2 border border-odoo-border rounded-lg text-sm font-bold text-odoo-textPrimary hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => setIsAdvancedOpen(false)}
              className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </Drawer>

      {/* Transfer Request Dialog Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsTransferOpen(false)}></div>
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in text-xs">
            <h3 className="text-base font-bold text-odoo-textPrimary">
              Initiate Transfer for {transferTarget?.asset.name}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">New Proposed Employee Holder *</label>
                <select
                  value={transferTargetEmployeeId}
                  onChange={(e) => setTransferTargetEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees?.filter(e => e.uuid !== transferTarget?.employeeId).map(emp => (
                    <option key={emp.uuid} value={emp.uuid}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Transfer Reason / Remarks *</label>
                <textarea
                  rows="3"
                  placeholder="Specify reason for moving this asset..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsTransferOpen(false)}
                className="flex-1 py-2 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 text-sm font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!transferTargetEmployeeId || !transferReason.trim() || transferMutation.isPending}
                onClick={() => transferMutation.mutate({
                  allocationId: transferTarget.id,
                  requestedToId: transferTargetEmployeeId,
                  reason: transferReason.trim()
                })}
                className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Request Inspection Modal */}
      {isReturnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsReturnOpen(false)}></div>
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in text-xs">
            <h3 className="text-base font-bold text-odoo-textPrimary">
              Initiate Return Request for {returnTarget?.asset.name}
            </h3>

            <form onSubmit={handleReturnSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Inspection Return Condition *</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                  required
                >
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="DAMAGED">Damaged (Direct route to maintenance)</option>
                  <option value="NEEDS_REPAIR">Needs Repair (Direct route to maintenance)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Upload Attachment / Inspection Photo</label>
                <input
                  type="file"
                  onChange={(e) => setReturnPhoto(e.target.files[0])}
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="w-full text-xs border border-odoo-border rounded-lg p-2 focus-ring file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-light file:text-primary file:cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Inspection Notes *</label>
                <textarea
                  rows="3"
                  placeholder="Specify condition details, scratches or remarks..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                  required
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsReturnOpen(false)}
                  className="flex-1 py-2 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 text-sm font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!returnNotes.trim() || isSubmittingReturn}
                  className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  Raise Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default AllocationsDashboard;
