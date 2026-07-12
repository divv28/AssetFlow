import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

import DashboardLayout from '../layouts/DashboardLayout';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import Drawer from '../components/Drawer';
import ConfirmationDialog from '../components/ConfirmationDialog';
import RegisterAssetDrawer from '../components/RegisterAssetDrawer';

import { 
  Plus, Filter, X, ChevronDown, Check, SlidersHorizontal, 
  Trash2, Copy, FileText, Download, QrCode, ClipboardList, Info 
} from 'lucide-react';

export const AssetsDirectory = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';
  const isAuthorizedToEdit = isAdminOrManager || user?.role === 'DEPARTMENT_HEAD';

  // Allocation Modal State
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [allocateTargetAsset, setAllocateTargetAsset] = useState(null);
  const [allocateTargetEmployeeId, setAllocateTargetEmployeeId] = useState('');
  const [allocateReason, setAllocateReason] = useState('');
  const [allocateExpectedReturn, setAllocateExpectedReturn] = useState('');
  const [allocateCondition, setAllocateCondition] = useState('NEW');
  const [allocateDepartmentId, setAllocateDepartmentId] = useState('');

  // State Management
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page')) || 1;
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  
  // Quick Filters
  const [catFilter, setCatFilter] = useState(searchParams.get('categoryId') || '');
  const [deptFilter, setDeptFilter] = useState(searchParams.get('departmentId') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [condFilter, setCondFilter] = useState(searchParams.get('condition') || '');
  const [bookableFilter, setBookableFilter] = useState(searchParams.get('isBookable') || '');
  const [showDeleted, setShowDeleted] = useState(searchParams.get('showDeleted') === 'true');

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  // Advanced Filters Drawer
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [costMin, setCostMin] = useState(searchParams.get('costMin') || '');
  const [costMax, setCostMax] = useState(searchParams.get('costMax') || '');
  const [locFilter, setLocFilter] = useState(searchParams.get('location') || '');
  const [manFilter, setManFilter] = useState(searchParams.get('manufacturer') || '');
  const [venFilter, setVenFilter] = useState(searchParams.get('vendor') || '');
  const [purchaseStart, setPurchaseStart] = useState(searchParams.get('purchaseDateStart') || '');
  const [purchaseEnd, setPurchaseEnd] = useState(searchParams.get('purchaseDateEnd') || '');
  const [warrantyStart, setWarrantyStart] = useState(searchParams.get('warrantyExpiryStart') || '');
  const [warrantyEnd, setWarrantyEnd] = useState(searchParams.get('warrantyExpiryEnd') || '');

  // Saved Filters (Local Storage)
  const [savedFiltersList, setSavedFiltersList] = useState([]);
  const [newSaveName, setNewSaveName] = useState('');

  // Modals / Drawers states
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedAssetIdForEdit, setSelectedAssetIdForEdit] = useState(null);
  const [activeActionsDropdown, setActiveActionsDropdown] = useState(null);
  
  // Status transitions modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTargetAsset, setStatusTargetAsset] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  // Confirm dialogs
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => {},
  });

  // Debounced search logic (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load Saved Filters
  useEffect(() => {
    const saved = localStorage.getItem('asset_saved_filters');
    if (saved) {
      setSavedFiltersList(JSON.parse(saved));
    }
  }, []);

  // Update query params in browser URL
  useEffect(() => {
    const params = { page: String(page) };
    if (debouncedSearch) params.search = debouncedSearch;
    if (catFilter) params.categoryId = catFilter;
    if (deptFilter) params.departmentId = deptFilter;
    if (statusFilter) params.status = statusFilter;
    if (condFilter) params.condition = condFilter;
    if (bookableFilter) params.isBookable = bookableFilter;
    if (showDeleted) params.showDeleted = 'true';
    if (costMin) params.costMin = costMin;
    if (costMax) params.costMax = costMax;
    if (locFilter) params.location = locFilter;
    if (manFilter) params.manufacturer = manFilter;
    if (venFilter) params.vendor = venFilter;
    if (purchaseStart) params.purchaseDateStart = purchaseStart;
    if (purchaseEnd) params.purchaseDateEnd = purchaseEnd;
    if (warrantyStart) params.warrantyExpiryStart = warrantyStart;
    if (warrantyEnd) params.warrantyExpiryEnd = warrantyEnd;

    setSearchParams(params);
  }, [
    page, debouncedSearch, catFilter, deptFilter, statusFilter, condFilter, 
    bookableFilter, showDeleted, costMin, costMax, locFilter, manFilter, 
    venFilter, purchaseStart, purchaseEnd, warrantyStart, warrantyEnd
  ]);

  // Fetch lists
  const { data: categories } = useQuery({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const res = await api.get('/api/categories', { params: { limit: 100, status: 'ACTIVE' } });
      return res.data.data;
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await api.get('/api/departments', { params: { limit: 100, status: 'ACTIVE' } });
      return res.data.data;
    },
  });

  // Query assets
  const { data: assetsData, isLoading: isAssetsLoading } = useQuery({
    queryKey: [
      'assets', page, debouncedSearch, catFilter, deptFilter, statusFilter, condFilter, 
      bookableFilter, showDeleted, sortBy, order, costMin, costMax, locFilter, manFilter, 
      venFilter, purchaseStart, purchaseEnd, warrantyStart, warrantyEnd
    ],
    queryFn: async () => {
      const params = {
        page,
        limit: 15,
        sortBy,
        order,
        search: debouncedSearch,
        categoryId: catFilter,
        departmentId: deptFilter,
        status: statusFilter,
        condition: condFilter,
        isBookable: bookableFilter,
        showDeleted,
        costMin,
        costMax,
        location: locFilter,
        manufacturer: manFilter,
        vendor: venFilter,
        purchaseDateStart: purchaseStart,
        purchaseDateEnd: purchaseEnd,
        warrantyExpiryStart: warrantyStart,
        warrantyExpiryEnd: warrantyEnd,
      };
      const res = await api.get('/api/assets', { params });
      return res.data;
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/assets/${id}`);
    },
    onSuccess: () => {
      addToast('success', 'Asset successfully soft-deleted');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setConfirmDialog({ ...confirmDialog, isOpen: false });
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to soft delete asset');
      setConfirmDialog({ ...confirmDialog, isOpen: false });
    },
  });

  // Duplicate Mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/api/assets/${id}/duplicate`);
      return res.data.data;
    },
    onSuccess: (data) => {
      addToast('success', `Asset successfully duplicated! New Tag: ${data.assetTag}`);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to duplicate asset');
    },
  });

  // Status transition mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, toStatus, reason }) => {
      const res = await api.patch(`/api/assets/${id}/status`, { toStatus, reason });
      return res.data.data;
    },
    onSuccess: (data) => {
      addToast('success', `Asset tag ${data.assetTag} status manually changed to ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsStatusModalOpen(false);
      setStatusReason('');
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to change lifecycle status');
    },
  });

  // Fetch employees list for allocation
  const { data: employees } = useQuery({
    queryKey: ['employees-allocation-list', user?.departmentId],
    queryFn: async () => {
      const params = { limit: 100, status: 'ACTIVE' };
      if (user?.role === 'DEPARTMENT_HEAD') {
        params.departmentId = user.departmentId;
      }
      const res = await api.get('/api/employees', { params });
      return res.data.data;
    },
    enabled: isAllocateOpen,
  });

  // Allocation mutation — calls full POST /api/allocations to create proper Allocation record
  const allocateMutation = useMutation({
    mutationFn: async ({ assetId, employeeId, departmentId, expectedReturnDate, conditionAtAllocation, remarks }) => {
      const res = await api.post('/api/allocations', {
        assetId,
        employeeId,
        departmentId,
        expectedReturnDate: expectedReturnDate || null,
        conditionAtAllocation,
        remarks,
      });
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Asset successfully allocated! Allocation record created.');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsAllocateOpen(false);
      setAllocateTargetAsset(null);
      setAllocateTargetEmployeeId('');
      setAllocateReason('');
      setAllocateExpectedReturn('');
      setAllocateCondition('NEW');
      setAllocateDepartmentId('');
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to allocate asset');
    },
  });

  // Auto-populate department from selected employee
  const handleAllocateEmployeeChange = (employeeId) => {
    setAllocateTargetEmployeeId(employeeId);
    if (employeeId && employees) {
      const emp = employees.find(e => e.uuid === employeeId);
      if (emp?.departmentId) setAllocateDepartmentId(emp.departmentId);
      else setAllocateDepartmentId('');
    } else {
      setAllocateDepartmentId('');
    }
  };

  // Action Triggers
  const handleDistributeClick = (asset) => {
    setAllocateTargetAsset(asset);
    setAllocateTargetEmployeeId('');
    setAllocateReason('');
    setAllocateExpectedReturn('');
    setAllocateCondition(asset.condition || 'NEW');
    setAllocateDepartmentId('');
    setIsAllocateOpen(true);
    setActiveActionsDropdown(null);
  };

  const handleReturnClick = (asset) => {
    setConfirmDialog({
      isOpen: true,
      title: `Return Asset ${asset.assetTag}`,
      message: `Are you sure you want to return "${asset.name}" back to general inventory? This will reset its allocation.`,
      confirmText: 'Confirm Return',
      onConfirm: () => {
        allocateMutation.mutate({ id: asset.id, allocatedToId: null, reason: 'Returned to inventory' });
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
    setActiveActionsDropdown(null);
  };

  const handleRegisterSuccess = (newAsset) => {
    // Stay on directory — the query is already invalidated by the drawer mutation
    // Just show the new asset highlighted via URL param
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    addToast('success', `Asset ${newAsset.assetTag} registered! It now appears in the directory.`);
  };

  const handleEditClick = (asset) => {
    setSelectedAssetIdForEdit(asset.id);
    setIsRegisterOpen(true);
    setActiveActionsDropdown(null);
  };

  const handleDuplicateClick = (asset) => {
    duplicateMutation.mutate(asset.id);
    setActiveActionsDropdown(null);
  };

  const handleStatusChangeClick = (asset) => {
    setStatusTargetAsset(asset);
    setNewStatus('');
    setStatusReason('');
    setIsStatusModalOpen(true);
    setActiveActionsDropdown(null);
  };

  const handleDeleteClick = (asset) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Asset ${asset.assetTag}`,
      message: `Are you sure you want to soft-delete "${asset.name}"? This asset will be hidden from default views.`,
      confirmText: 'Delete Asset',
      onConfirm: () => deleteMutation.mutate(asset.id),
    });
    setActiveActionsDropdown(null);
  };

  // Status color helpers
  const getStatusBadgeType = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'success';
      case 'ALLOCATED':
        return 'info';
      case 'RESERVED':
        return 'warning';
      case 'UNDER_MAINTENANCE':
        return 'danger';
      case 'LOST':
        return 'danger';
      case 'RETIRED':
      default:
        return 'neutral';
    }
  };

  // Local Storage Save Filter Helpers
  const handleSaveCurrentFilter = () => {
    if (!newSaveName.trim()) {
      addToast('error', 'Please enter a name for the saved filter');
      return;
    }

    const payload = {
      name: newSaveName.trim(),
      filters: {
        catFilter, deptFilter, statusFilter, condFilter, bookableFilter,
        costMin, costMax, locFilter, manFilter, venFilter,
        purchaseStart, purchaseEnd, warrantyStart, warrantyEnd
      }
    };

    const updated = [...savedFiltersList, payload];
    setSavedFiltersList(updated);
    localStorage.setItem('asset_saved_filters', JSON.stringify(updated));
    setNewSaveName('');
    addToast('success', `Filter "${payload.name}" saved locally`);
  };

  const handleLoadSavedFilter = (item) => {
    const f = item.filters;
    setCatFilter(f.catFilter || '');
    setDeptFilter(f.deptFilter || '');
    setStatusFilter(f.statusFilter || '');
    setCondFilter(f.condFilter || '');
    setBookableFilter(f.bookableFilter || '');
    setCostMin(f.costMin || '');
    setCostMax(f.costMax || '');
    setLocFilter(f.locFilter || '');
    setManFilter(f.manFilter || '');
    setVenFilter(f.venFilter || '');
    setPurchaseStart(f.purchaseStart || '');
    setPurchaseEnd(f.purchaseEnd || '');
    setWarrantyStart(f.warrantyStart || '');
    setWarrantyEnd(f.warrantyEnd || '');
    setSearchParams({ page: '1' });
    addToast('info', `Loaded filter "${item.name}"`);
  };

  const handleClearFilters = () => {
    setCatFilter('');
    setDeptFilter('');
    setStatusFilter('');
    setCondFilter('');
    setBookableFilter('');
    setCostMin('');
    setCostMax('');
    setLocFilter('');
    setManFilter('');
    setVenFilter('');
    setPurchaseStart('');
    setPurchaseEnd('');
    setWarrantyStart('');
    setWarrantyEnd('');
    setShowDeleted(false);
    setSearch('');
    addToast('info', 'Filters reset to default');
  };

  // Table Configuration columns
  const tableColumns = [
    {
      header: 'Photo',
      accessor: (row) => {
        const photo = row.documents?.find(d => d.fileType === 'photo');
        return photo ? (
          <img src={photo.fileUrl} className="w-8.5 h-8.5 rounded-lg border border-odoo-border object-cover" alt="Asset" />
        ) : (
          <div className="w-8.5 h-8.5 rounded-lg border border-dashed border-odoo-border flex items-center justify-center bg-odoo-bg text-[10px] text-gray-400 font-bold uppercase">
            NA
          </div>
        );
      }
    },
    {
      header: 'Asset Tag',
      accessor: (row) => <span className="font-mono text-xs font-bold text-primary">{row.assetTag}</span>,
      sortBy: 'assetTag'
    },
    {
      header: 'Asset Name',
      accessor: (row) => <span className="font-bold text-odoo-textPrimary">{row.name}</span>,
      sortBy: 'name'
    },
    {
      header: 'Category',
      accessor: (row) => <span className="font-semibold text-odoo-textSecondary text-xs">{row.category?.name}</span>
    },
    {
      header: 'Department',
      accessor: (row) => <span className="font-semibold text-odoo-textSecondary text-xs">{row.department?.name || 'Global'}</span>
    },
    {
      header: 'Status',
      accessor: (row) => (
        <StatusBadge type={getStatusBadgeType(row.status)} label={row.status} />
      ),
      sortBy: 'status'
    },
    {
      header: 'Condition',
      accessor: (row) => (
        <span className="text-[10px] font-bold px-2 py-0.5 border border-odoo-border rounded bg-odoo-bg text-odoo-textPrimary">
          {row.condition}
        </span>
      )
    },
    {
      header: 'Location',
      accessor: (row) => <span className="text-xs text-odoo-textSecondary">{row.location || '—'}</span>
    },
    {
      header: 'Shared',
      accessor: (row) => (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${row.isBookable ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-400'}`}>
          {row.isBookable ? 'Yes' : 'No'}
        </span>
      )
    },
    {
      header: 'Created Date',
      accessor: (row) => <span className="text-xs text-odoo-textSecondary">{new Date(row.createdAt).toLocaleDateString()}</span>,
      sortBy: 'createdAt'
    },
    {
      header: 'Actions',
      accessor: (row) => {
        const isOpen = activeActionsDropdown === row.id;
        const isSoftDeleteDisabled = row.status !== 'AVAILABLE';

        return (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveActionsDropdown(isOpen ? null : row.id);
              }}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-odoo-textSecondary" />
            </button>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setActiveActionsDropdown(null)}></div>
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-odoo-border rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-odoo-border py-1">
                  <div>
                    <button
                      onClick={() => navigate(`/assets/${row.id}`)}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-odoo-textPrimary hover:bg-odoo-bg flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Details
                    </button>
                    {isAuthorizedToEdit && (
                      <button
                        onClick={() => handleEditClick(row)}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-odoo-textPrimary hover:bg-odoo-bg flex items-center gap-2"
                      >
                        <Info className="w-3.5 h-3.5" />
                        Edit Details
                      </button>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => window.open(`/api/assets/${row.id}/qr`, '_blank')}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-odoo-textPrimary hover:bg-odoo-bg flex items-center gap-2"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Download QR Code
                    </button>
                    {isAuthorizedToEdit && (
                      <>
                        {(row.status === 'AVAILABLE' || row.status === 'RESERVED') && (
                          <button
                            onClick={() => handleDistributeClick(row)}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-primary hover:bg-odoo-bg flex items-center gap-2"
                          >
                            <ClipboardList className="w-3.5 h-3.5 text-primary" />
                            Distribute Asset
                          </button>
                        )}
                        {row.status === 'ALLOCATED' && (
                          <button
                            onClick={() => handleReturnClick(row)}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-orange-600 hover:bg-odoo-bg flex items-center gap-2"
                          >
                            <ClipboardList className="w-3.5 h-3.5 text-orange-600" />
                            Return Asset
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChangeClick(row)}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-odoo-textPrimary hover:bg-odoo-bg flex items-center gap-2"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          Change Status
                        </button>
                      </>
                    )}
                    {isAdminOrManager && (
                      <button
                        onClick={() => handleDuplicateClick(row)}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-odoo-textPrimary hover:bg-odoo-bg flex items-center gap-2"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicate Asset
                      </button>
                    )}
                  </div>
                  {isAdminOrManager && (
                    <div>
                      <button
                        disabled={isSoftDeleteDisabled}
                        onClick={() => handleDeleteClick(row)}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center gap-2 ${
                          isSoftDeleteDisabled
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={isSoftDeleteDisabled ? 'Only AVAILABLE assets can be soft-deleted' : ''}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Soft Delete
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <DashboardLayout 
      title="Asset Directory" 
      breadcrumbs={[{ label: 'Home', path: '/dashboard' }, { label: 'Assets' }]}
    >
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Top Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-lg">
            <SearchBar 
              value={search} 
              onChange={(val) => { setSearch(val); setSearchParams({ page: '1' }); }} 
              placeholder="Search Asset Tag, Name, Serial Number, Manufacturer..." 
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAdvancedOpen(true)}
              className="px-4 py-2.5 bg-white border border-odoo-border text-odoo-textPrimary font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span>Advanced Filters</span>
            </button>

            {isAuthorizedToEdit && (
              <button
                onClick={() => { setSelectedAssetIdForEdit(null); setIsRegisterOpen(true); }}
                className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-sm flex items-center gap-2 transition-all-custom shadow-md hover:shadow-lg"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Register Asset</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Chips Panel */}
        <div className="bg-white p-4 rounded-card border border-odoo-border shadow-sm flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-odoo-textSecondary uppercase tracking-wider shrink-0">
            <Filter className="w-3.5 h-3.5 text-primary" />
            <span>Quick Filters:</span>
          </div>

          {/* Category Dropdown Filter */}
          <select
            value={catFilter}
            onChange={(e) => { setCatFilter(e.target.value); setSearchParams({ page: '1' }); }}
            className="px-3 py-1.5 bg-white border border-odoo-border rounded-lg text-xs font-semibold text-odoo-textPrimary focus-ring"
          >
            <option value="">All Categories</option>
            {categories?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Department Dropdown Filter */}
          {user?.role !== 'DEPARTMENT_HEAD' && (
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setSearchParams({ page: '1' }); }}
              className="px-3 py-1.5 bg-white border border-odoo-border rounded-lg text-xs font-semibold text-odoo-textPrimary focus-ring"
            >
              <option value="">All Departments</option>
              {departments?.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

          {/* Status Dropdown Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setSearchParams({ page: '1' }); }}
            className="px-3 py-1.5 bg-white border border-odoo-border rounded-lg text-xs font-semibold text-odoo-textPrimary focus-ring"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ALLOCATED">Allocated</option>
            <option value="RESERVED">Reserved</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="LOST">Lost</option>
            <option value="RETIRED">Retired</option>
            <option value="DISPOSED">Disposed</option>
          </select>

          {/* Condition Dropdown Filter */}
          <select
            value={condFilter}
            onChange={(e) => { setCondFilter(e.target.value); setSearchParams({ page: '1' }); }}
            className="px-3 py-1.5 bg-white border border-odoo-border rounded-lg text-xs font-semibold text-odoo-textPrimary focus-ring"
          >
            <option value="">All Conditions</option>
            <option value="NEW">New</option>
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
            <option value="POOR">Poor</option>
            <option value="DAMAGED">Damaged</option>
          </select>

          {/* Shared Assets toggle */}
          <button
            onClick={() => setBookableFilter(bookableFilter === 'true' ? '' : 'true')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              bookableFilter === 'true'
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-odoo-border text-odoo-textPrimary hover:bg-gray-50'
            }`}
          >
            Shared / Bookable
          </button>

          {/* Show Deleted Toggle */}
          {isAdminOrManager && (
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                showDeleted
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white border-odoo-border text-odoo-textPrimary hover:bg-gray-50'
              }`}
            >
              Show Soft Deleted
            </button>
          )}

          {/* Clear Filters Button */}
          <button
            onClick={handleClearFilters}
            className="ml-auto px-2.5 py-1.5 border border-dashed border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors"
          >
            Reset Filters
          </button>
        </div>

        {/* Saved Filters Local List (Scoped to browser localStorage) */}
        {savedFiltersList.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-[10px] font-bold text-odoo-textSecondary uppercase shrink-0">Saved (local):</span>
            {savedFiltersList.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleLoadSavedFilter(item)}
                className="px-2.5 py-1 bg-odoo-bg border border-odoo-border rounded-full text-xs font-semibold text-odoo-textPrimary hover:border-primary transition-colors shrink-0"
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-card shadow-sm border border-odoo-border overflow-hidden">
          <DataTable
            columns={tableColumns}
            data={assetsData?.data || []}
            isLoading={isAssetsLoading}
            sortBy={sortBy}
            sortOrder={order}
            onSort={(field, ord) => { setSortBy(field); setOrder(ord); }}
            page={page}
            totalPages={assetsData?.meta?.totalPages || 1}
            totalCount={assetsData?.meta?.total || 0}
            onPageChange={(p) => setSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(p) })}
          />
        </div>

      </div>

      {/* Advanced Filters Drawer */}
      <Drawer
        isOpen={isAdvancedOpen}
        onClose={() => setIsAdvancedOpen(false)}
        title="Advanced Filters Options"
      >
        <div className="space-y-5 pb-20">
          
          {/* Cost Range */}
          <div>
            <label className="block text-xs font-bold text-odoo-textSecondary uppercase mb-1.5">Acquisition Cost Range</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Min ($)"
                value={costMin}
                onChange={(e) => setCostMin(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
              <input
                type="number"
                placeholder="Max ($)"
                value={costMax}
                onChange={(e) => setCostMax(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-odoo-textSecondary uppercase mb-1.5">Physical Location</label>
            <input
              type="text"
              placeholder="e.g. Headquarters"
              value={locFilter}
              onChange={(e) => setLocFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            />
          </div>

          {/* Manufacturer & Vendor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-odoo-textSecondary uppercase mb-1.5">Manufacturer</label>
              <input
                type="text"
                placeholder="Apple"
                value={manFilter}
                onChange={(e) => setManFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-odoo-textSecondary uppercase mb-1.5">Vendor</label>
              <input
                type="text"
                placeholder="Amazon"
                value={venFilter}
                onChange={(e) => setVenFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
            </div>
          </div>

          {/* Purchase Date Range */}
          <div>
            <label className="block text-xs font-bold text-odoo-textSecondary uppercase mb-1.5">Purchase Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={purchaseStart}
                onChange={(e) => setPurchaseStart(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
              <input
                type="date"
                value={purchaseEnd}
                onChange={(e) => setPurchaseEnd(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
            </div>
          </div>

          {/* Warranty Date Range */}
          <div>
            <label className="block text-xs font-bold text-odoo-textSecondary uppercase mb-1.5">Warranty Expiry Range</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={warrantyStart}
                onChange={(e) => setWarrantyStart(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
              <input
                type="date"
                value={warrantyEnd}
                onChange={(e) => setWarrantyEnd(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              />
            </div>
          </div>

          <div className="border-t border-odoo-border pt-4 space-y-4">
            <h4 className="text-xs font-bold text-odoo-textPrimary uppercase">Save These Filters (Local)</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Filter Name..."
                value={newSaveName}
                onChange={(e) => setNewSaveName(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-odoo-border rounded-lg text-xs focus-ring"
              />
              <button
                type="button"
                onClick={handleSaveCurrentFilter}
                className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors shrink-0"
              >
                Save
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="absolute bottom-0 right-0 max-w-md w-full bg-white border-t border-odoo-border p-4 flex gap-3 z-10 shrink-0">
          <button
            onClick={() => { handleClearFilters(); setIsAdvancedOpen(false); }}
            className="flex-1 py-2.5 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 text-sm font-bold rounded-lg transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={() => setIsAdvancedOpen(false)}
            className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
          >
            Apply Filters
          </button>
        </div>
      </Drawer>

      {/* Manual Status Transition Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsStatusModalOpen(false)}></div>
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <h3 className="text-base font-bold text-odoo-textPrimary">
              Change Lifecycle Status of {statusTargetAsset?.assetTag}
            </h3>
            <p className="text-xs text-odoo-textSecondary">
              Current status: <span className="font-bold text-odoo-textPrimary">{statusTargetAsset?.status}</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1.5 uppercase">New Target Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
                >
                  <option value="">Select Status</option>
                  <option value="AVAILABLE">AVAILABLE (Available for allocation)</option>
                  <option value="ALLOCATED">ALLOCATED (Assigned to employee)</option>
                  <option value="RESERVED">RESERVED (On hold for department)</option>
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE (Repair status)</option>
                  <option value="LOST">LOST (Asset misplaced/unaccounted)</option>
                  <option value="RETIRED">RETIRED (End of service life)</option>
                  <option value="DISPOSED">DISPOSED (Sold or scrapped)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1.5 uppercase">Reason *</label>
                <textarea
                  rows="3"
                  placeholder="Specify details for this change..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="flex-1 py-2 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 text-xs font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newStatus || !statusReason.trim() || statusMutation.isPending}
                onClick={() => statusMutation.mutate({
                  id: statusTargetAsset.id,
                  toStatus: newStatus,
                  reason: statusReason.trim(),
                })}
                className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Distribute Asset Allocation Modal */}
      {isAllocateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setIsAllocateOpen(false)}></div>
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-odoo-textPrimary">
              Distribute Asset to Employee
            </h3>
            
            <div className="bg-odoo-bg border border-odoo-border rounded-lg p-3 text-xs text-odoo-textSecondary">
              <span className="block font-bold text-odoo-textPrimary">Asset:</span>
              <span className="font-mono text-primary font-bold">{allocateTargetAsset?.assetTag}</span>
              <span className="ml-2">{allocateTargetAsset?.name}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1.5 uppercase">Select Active Employee *</label>
                <select
                  value={allocateTargetEmployeeId}
                  onChange={(e) => handleAllocateEmployeeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
                >
                  <option value="">Choose Employee</option>
                  {employees?.map(emp => (
                    <option key={emp.uuid} value={emp.uuid}>
                      {emp.name} — {emp.email} {emp.department ? `(${emp.department.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-odoo-textSecondary mb-1.5 uppercase">Asset Condition *</label>
                  <select
                    value={allocateCondition}
                    onChange={(e) => setAllocateCondition(e.target.value)}
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
                  <label className="block text-xs font-bold text-odoo-textSecondary mb-1.5 uppercase">Expected Return</label>
                  <input
                    type="date"
                    value={allocateExpectedReturn}
                    onChange={(e) => setAllocateExpectedReturn(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1.5 uppercase">Reason / Remarks</label>
                <textarea
                  rows="2"
                  placeholder="Specify allocation purpose or notes..."
                  value={allocateReason}
                  onChange={(e) => setAllocateReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                ></textarea>
              </div>

              {!allocateDepartmentId && allocateTargetEmployeeId && (
                <p className="text-xs text-red-500 font-semibold">
                  ⚠️ Selected employee is not assigned to any department. Please assign them a department first.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAllocateOpen(false)}
                className="flex-1 py-2 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 text-xs font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!allocateTargetEmployeeId || !allocateDepartmentId || allocateMutation.isPending}
                onClick={() => allocateMutation.mutate({
                  assetId: allocateTargetAsset.id,
                  employeeId: allocateTargetEmployeeId,
                  departmentId: allocateDepartmentId,
                  expectedReturnDate: allocateExpectedReturn || null,
                  conditionAtAllocation: allocateCondition,
                  remarks: allocateReason.trim() || null,
                })}
                className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {allocateMutation.isPending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Allocate Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register/Edit Asset Drawer */}
      <RegisterAssetDrawer
        isOpen={isRegisterOpen}
        onClose={() => { setIsRegisterOpen(false); setSelectedAssetIdForEdit(null); }}
        assetId={selectedAssetIdForEdit}
        onSuccess={handleRegisterSuccess}
      />

      {/* Global Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isLoading={deleteMutation.isPending}
      />

    </DashboardLayout>
  );
};

export default AssetsDirectory;
