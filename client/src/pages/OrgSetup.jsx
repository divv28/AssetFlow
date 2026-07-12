import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { useToast } from '../contexts/ToastContext';
import { 
  Building2, Laptop, Users, Plus, Edit2, ToggleLeft, ToggleRight, 
  UserCheck, ShieldCheck, Mail, ShieldAlert, Award, Calendar, FolderHeart
} from 'lucide-react';

// ==========================================
// Zod Form Validators (Frontend)
// ==========================================
const departmentFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  code: z.string().trim().min(1, 'Code is required').max(10).toUpperCase(),
  description: z.string().trim().optional(),
  parentDepartmentId: z.string().optional().or(z.literal('')),
  headId: z.string().optional().or(z.literal('')),
});

const categoryFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  description: z.string().trim().optional(),
  warrantyMonths: z.coerce.number().int().min(0, 'Warranty months must be 0 or positive'),
  depreciationYears: z.coerce.number().int().min(0, 'Depreciation years must be 0 or positive'),
});

// ==========================================
// Main Component
// ==========================================
export const OrgSetup = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('departments');

  // Search & Pagination States
  const [deptSearch, setDeptSearch] = useState('');
  const [deptPage, setDeptPage] = useState(1);
  const [deptSort, setDeptSort] = useState('createdAt');
  const [deptOrder, setDeptOrder] = useState('desc');

  const [catSearch, setCatSearch] = useState('');
  const [catPage, setCatPage] = useState(1);
  const [catSort, setCatSort] = useState('createdAt');
  const [catOrder, setCatOrder] = useState('desc');

  const [empSearch, setEmpSearch] = useState('');
  const [empPage, setEmpPage] = useState(1);
  const [empSort, setEmpSort] = useState('createdAt');
  const [empOrder, setEmpOrder] = useState('desc');
  const [empRoleFilter, setEmpRoleFilter] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('');

  // UI Control States
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [isEmpDrawerOpen, setIsEmpDrawerOpen] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // ==========================================
  // React Query: Data Fetching Hooks
  // ==========================================
  
  // List Departments
  const { data: deptsData, isLoading: isDeptsLoading } = useQuery({
    queryKey: ['departments', deptPage, deptSearch, deptSort, deptOrder],
    queryFn: async () => {
      const res = await api.get('/api/departments', {
        params: { page: deptPage, limit: 10, search: deptSearch, sortBy: deptSort, order: deptOrder },
      });
      return res.data;
    },
  });

  // Fetch all departments for select dropdowns (unpaginated/ignored page limit to grab all active ones)
  const { data: allDeptsList } = useQuery({
    queryKey: ['all-departments-list'],
    queryFn: async () => {
      const res = await api.get('/api/departments', { params: { limit: 100, status: 'ACTIVE' } });
      return res.data.data;
    },
  });

  // Fetch all active employees for Head selection dropdowns
  const { data: allEmpsList } = useQuery({
    queryKey: ['all-employees-list'],
    queryFn: async () => {
      const res = await api.get('/api/employees', { params: { limit: 100, status: 'ACTIVE' } });
      return res.data.data;
    },
  });

  // List Categories
  const { data: catsData, isLoading: isCatsLoading } = useQuery({
    queryKey: ['categories', catPage, catSearch, catSort, catOrder],
    queryFn: async () => {
      const res = await api.get('/api/categories', {
        params: { page: catPage, limit: 10, search: catSearch, sortBy: catSort, order: catOrder },
      });
      return res.data;
    },
  });

  // List Employees
  const { data: empsData, isLoading: isEmpsLoading } = useQuery({
    queryKey: ['employees', empPage, empSearch, empSort, empOrder, empRoleFilter, empDeptFilter],
    queryFn: async () => {
      const res = await api.get('/api/employees', {
        params: {
          page: empPage,
          limit: 10,
          search: empSearch,
          sortBy: empSort,
          order: empOrder,
          role: empRoleFilter || undefined,
          departmentId: empDeptFilter || undefined,
        },
      });
      return res.data;
    },
  });

  // ==========================================
  // React Query: Mutations (Create/Update/Status)
  // ==========================================

  // Department Mutations
  const deptMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingDept) {
        return api.put(`/api/departments/${editingDept.id}`, payload);
      }
      return api.post('/api/departments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['all-departments-list'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      addToast(editingDept ? 'Department updated successfully!' : 'Department created successfully!', 'success');
      setIsDeptModalOpen(false);
      setEditingDept(null);
    },
    onError: (err) => {
      addToast(err.response?.data?.message || 'Failed to save department. Verify hierarchies.', 'error');
    },
  });

  const deptStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return api.patch(`/api/departments/${id}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['all-departments-list'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      addToast(`Department status changed to ${variables.status}.`, 'success');
      setConfirmDialog({ isOpen: false });
    },
    onError: (err) => {
      addToast(err.response?.data?.message || 'Failed to update department status.', 'error');
      setConfirmDialog({ isOpen: false });
    },
  });

  // Category Mutations
  const catMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCat) {
        return api.put(`/api/categories/${editingCat.id}`, payload);
      }
      return api.post('/api/categories', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast(editingCat ? 'Asset Category updated successfully!' : 'Asset Category created successfully!', 'success');
      setIsCatModalOpen(false);
      setEditingCat(null);
    },
    onError: (err) => {
      addToast(err.response?.data?.message || 'Failed to save asset category.', 'error');
    },
  });

  const catStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return api.patch(`/api/categories/${id}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast(`Category status set to ${variables.status}.`, 'success');
      setConfirmDialog({ isOpen: false });
    },
    onError: (err) => {
      addToast(err.response?.data?.message || 'Failed to update category status.', 'error');
      setConfirmDialog({ isOpen: false });
    },
  });

  // Employee Directory Mutations
  const empRoleMutation = useMutation({
    mutationFn: async ({ id, role }) => {
      return api.patch(`/api/employees/${id}/role`, { role });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      addToast('Employee role promoted/changed successfully.', 'success');
      if (selectedEmp && selectedEmp.uuid === res.data.data.uuid) {
        setSelectedEmp(res.data.data);
      }
      setConfirmDialog({ isOpen: false });
    },
    onError: (err) => {
      addToast(err.response?.data?.message || 'Failed to update employee role.', 'error');
      setConfirmDialog({ isOpen: false });
    },
  });

  const empDeptMutation = useMutation({
    mutationFn: async ({ id, departmentId }) => {
      return api.patch(`/api/employees/${id}/department`, { departmentId });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      addToast('Employee department reassigned successfully.', 'success');
      if (selectedEmp && selectedEmp.uuid === res.data.data.uuid) {
        setSelectedEmp(res.data.data);
      }
    },
    onError: (err) => {
      addToast(err.response?.data?.message || 'Failed to assign department.', 'error');
    },
  });

  const empStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return api.patch(`/api/employees/${id}/status`, { status });
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      addToast(`Employee status set to ${variables.status}.`, 'success');
      if (selectedEmp && selectedEmp.uuid === res.data.data.uuid) {
        setSelectedEmp(res.data.data);
      }
      setConfirmDialog({ isOpen: false });
    },
    onError: (err) => {
      addToast(err.response?.data?.message || 'Failed to modify employee status.', 'error');
      setConfirmDialog({ isOpen: false });
    },
  });

  // ==========================================
  // Form Definitions (React Hook Form)
  // ==========================================
  const {
    register: registerDept,
    handleSubmit: handleSubmitDept,
    reset: resetDeptForm,
    formState: { errors: deptErrors },
  } = useForm({
    resolver: zodResolver(departmentFormSchema),
  });

  const {
    register: registerCat,
    handleSubmit: handleSubmitCat,
    reset: resetCatForm,
    formState: { errors: catErrors },
  } = useForm({
    resolver: zodResolver(categoryFormSchema),
  });

  // Trigger Edit Handlers
  const handleEditDept = (dept) => {
    setEditingDept(dept);
    resetDeptForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      parentDepartmentId: dept.parentDepartmentId || '',
      headId: dept.head?.uuid || '',
    });
    setIsDeptModalOpen(true);
  };

  const handleCreateDeptClick = () => {
    setEditingDept(null);
    resetDeptForm({ name: '', code: '', description: '', parentDepartmentId: '', headId: '' });
    setIsDeptModalOpen(true);
  };

  const handleEditCat = (cat) => {
    setEditingCat(cat);
    resetCatForm({
      name: cat.name,
      description: cat.description || '',
      warrantyMonths: cat.warrantyMonths,
      depreciationYears: cat.depreciationYears,
    });
    setIsCatModalOpen(true);
  };

  const handleCreateCatClick = () => {
    setEditingCat(null);
    resetCatForm({ name: '', description: '', warrantyMonths: 0, depreciationYears: 0 });
    setIsCatModalOpen(true);
  };

  // Status Change Dialog Triggers
  const triggerDeptStatusToggle = (dept) => {
    const isActivating = dept.status === 'INACTIVE';
    setConfirmDialog({
      isOpen: true,
      title: isActivating ? 'Reactivate Department?' : 'Deactivate Department?',
      message: isActivating 
        ? `Are you sure you want to reactivate the ${dept.name} department? It will appear in dropdowns again.`
        : `Deactivating ${dept.name} will soft-delete the department. It cannot have any active employees assigned. Proceed?`,
      confirmText: isActivating ? 'Reactivate' : 'Deactivate',
      onConfirm: () => {
        deptStatusMutation.mutate({ id: dept.id, status: isActivating ? 'ACTIVE' : 'INACTIVE' });
      },
    });
  };

  const triggerCatStatusToggle = (cat) => {
    const isActivating = cat.status === 'INACTIVE';
    setConfirmDialog({
      isOpen: true,
      title: isActivating ? 'Reactivate Category?' : 'Deactivate Category?',
      message: `Are you sure you want to set the status of category "${cat.name}" to ${isActivating ? 'ACTIVE' : 'INACTIVE'}?`,
      confirmText: isActivating ? 'Reactivate' : 'Deactivate',
      onConfirm: () => {
        catStatusMutation.mutate({ id: cat.id, status: isActivating ? 'ACTIVE' : 'INACTIVE' });
      },
    });
  };

  const triggerEmpStatusToggle = (emp) => {
    const isActivating = emp.status === 'INACTIVE';
    setConfirmDialog({
      isOpen: true,
      title: isActivating ? 'Activate Employee?' : 'Deactivate Employee?',
      message: `Change status of ${emp.name} to ${isActivating ? 'ACTIVE' : 'INACTIVE'}? This directly restricts login access.`,
      confirmText: isActivating ? 'Activate' : 'Deactivate',
      onConfirm: () => {
        empStatusMutation.mutate({ id: emp.uuid, status: isActivating ? 'ACTIVE' : 'INACTIVE' });
      },
    });
  };

  const triggerEmpRolePromotion = (emp, targetRole) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Promote/Change Employee Role',
      message: `Are you sure you want to change the security role of ${emp.name} to ${targetRole}?`,
      confirmText: 'Change Role',
      onConfirm: () => {
        empRoleMutation.mutate({ id: emp.uuid, role: targetRole });
      },
    });
  };

  // Helper: Generates Avatar Initials
  const getInitials = (name) => {
    if (!name) return 'AF';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // ==========================================
  // Columns definitions for DataTables
  // ==========================================
  const departmentColumns = [
    { key: 'name', label: 'Department Name', sortable: true },
    { key: 'code', label: 'Code', sortable: true },
    { 
      key: 'head', 
      label: 'Department Head', 
      render: (row) => row.head ? (
        <span className="font-semibold text-primary">{row.head.name}</span>
      ) : (
        <span className="text-gray-400 italic">None assigned</span>
      )
    },
    { 
      key: 'parentDepartment', 
      label: 'Parent Department',
      render: (row) => row.parentDepartment ? (
        <span className="text-xs bg-gray-100 text-gray-800 border border-gray-200 px-2 py-0.5 rounded">
          {row.parentDepartment.name}
        </span>
      ) : (
        <span className="text-gray-400">—</span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'createdAt', 
      label: 'Created Date', 
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditDept(row)}
            className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors"
            title="Edit department info"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => triggerDeptStatusToggle(row)}
            className={`p-1 rounded-md transition-colors ${
              row.status === 'ACTIVE' 
                ? 'text-red-500 hover:bg-red-50 hover:text-red-700' 
                : 'text-green-500 hover:bg-green-50 hover:text-green-700'
            }`}
            title={row.status === 'ACTIVE' ? 'Deactivate Department' : 'Reactivate Department'}
          >
            {row.status === 'ACTIVE' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
        </div>
      ),
    },
  ];

  const categoryColumns = [
    { key: 'name', label: 'Category Name', sortable: true },
    { 
      key: 'warrantyMonths', 
      label: 'Warranty (Months)', 
      sortable: true,
      render: (row) => `${row.warrantyMonths}m`
    },
    { 
      key: 'depreciationYears', 
      label: 'Depreciation (Years)', 
      sortable: true,
      render: (row) => `${row.depreciationYears} yrs`
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditCat(row)}
            className="p-1 rounded-md text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => triggerCatStatusToggle(row)}
            className={`p-1 rounded-md transition-colors ${
              row.status === 'ACTIVE' 
                ? 'text-red-500 hover:bg-red-50 hover:text-red-700' 
                : 'text-green-500 hover:bg-green-50 hover:text-green-700'
            }`}
          >
            {row.status === 'ACTIVE' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
        </div>
      ),
    },
  ];

  const employeeColumns = [
    {
      key: 'avatar',
      label: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8.5 h-8.5 rounded-full bg-primary-light border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shadow-sm uppercase shrink-0">
            {getInitials(row.name)}
          </div>
          <div>
            <span className="block font-bold text-odoo-textPrimary">{row.name}</span>
            <span className="block text-[11px] text-odoo-textSecondary leading-none mt-0.5">{row.email}</span>
          </div>
        </div>
      ),
    },
    { 
      key: 'uuid', 
      label: 'Employee ID', 
      render: (row) => <span className="font-mono text-xs text-gray-500">{row.uuid.slice(0, 8).toUpperCase()}</span> 
    },
    { 
      key: 'department', 
      label: 'Department',
      render: (row) => row.department ? (
        <span className="font-semibold text-odoo-textPrimary">{row.department.name}</span>
      ) : (
        <span className="text-gray-400 italic">Unassigned</span>
      )
    },
    { 
      key: 'role', 
      label: 'Current Role', 
      sortable: true,
      render: (row) => {
        const role = row.role.split('_').join(' ');
        return (
          <span className="font-bold text-xs uppercase text-primary/95 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            {role}
          </span>
        );
      }
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (row) => (
        <button
          onClick={() => { setSelectedEmp(row); setIsEmpDrawerOpen(true); }}
          className="px-3 py-1.5 border border-odoo-border hover:border-primary/50 rounded-lg text-xs font-semibold text-odoo-textPrimary hover:bg-primary-light hover:text-primary transition-all-custom"
        >
          Manage Profile
        </button>
      )
    },
  ];

  return (
    <DashboardLayout 
      title="Organization Setup" 
      breadcrumbs={[{ label: 'Home', path: '/dashboard' }, { label: 'Organization Setup' }]}
    >
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Tab Headers */}
        <div className="flex border-b border-odoo-border bg-white rounded-xl shadow-sm p-1.5 shrink-0 select-none">
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all-custom ${
              activeTab === 'departments'
                ? 'bg-primary text-white shadow-md'
                : 'text-odoo-textSecondary hover:bg-gray-50 hover:text-primary'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Departments</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all-custom ${
              activeTab === 'categories'
                ? 'bg-primary text-white shadow-md'
                : 'text-odoo-textSecondary hover:bg-gray-50 hover:text-primary'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Asset Categories</span>
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all-custom ${
              activeTab === 'employees'
                ? 'bg-primary text-white shadow-md'
                : 'text-odoo-textSecondary hover:bg-gray-50 hover:text-primary'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Employee Directory</span>
          </button>
        </div>

        {/* Tab Content Areas */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <SearchBar value={deptSearch} onChange={(val) => { setDeptSearch(val); setDeptPage(1); }} placeholder="Search code or department..." />
              <button
                onClick={handleCreateDeptClick}
                className="w-full sm:w-auto px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all-custom hover:shadow-md shrink-0"
              >
                <Plus className="w-4.5 h-4.5" />
                Add Department
              </button>
            </div>

            <DataTable
              columns={departmentColumns}
              data={deptsData?.data || []}
              isLoading={isDeptsLoading}
              sortBy={deptSort}
              sortOrder={deptOrder}
              onSort={(field, order) => { setDeptSort(field); setDeptOrder(order); }}
              page={deptPage}
              totalPages={deptsData?.meta?.totalPages || 1}
              totalCount={deptsData?.meta?.total || 0}
              onPageChange={setDeptPage}
            />
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <SearchBar value={catSearch} onChange={(val) => { setCatSearch(val); setCatPage(1); }} placeholder="Search category names..." />
              <button
                onClick={handleCreateCatClick}
                className="w-full sm:w-auto px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all-custom hover:shadow-md shrink-0"
              >
                <Plus className="w-4.5 h-4.5" />
                Add Category
              </button>
            </div>

            <DataTable
              columns={categoryColumns}
              data={catsData?.data || []}
              isLoading={isCatsLoading}
              sortBy={catSort}
              sortOrder={catOrder}
              onSort={(field, order) => { setCatSort(field); setCatOrder(order); }}
              page={catPage}
              totalPages={catsData?.meta?.totalPages || 1}
              totalCount={catsData?.meta?.total || 0}
              onPageChange={setCatPage}
            />
          </div>
        )}

        {activeTab === 'employees' && (
          <div className="space-y-4">
            {/* Filters bar */}
            <div className="bg-white p-4 rounded-xl border border-odoo-border shadow-sm flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                <SearchBar value={empSearch} onChange={(val) => { setEmpSearch(val); setEmpPage(1); }} placeholder="Search name or email..." />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Role Filter */}
                <select
                  value={empRoleFilter}
                  onChange={(e) => { setEmpRoleFilter(e.target.value); setEmpPage(1); }}
                  className="px-3.5 py-2 border border-odoo-border focus-ring text-sm rounded-lg bg-white text-odoo-textPrimary"
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="ASSET_MANAGER">Asset Manager</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>

                {/* Dept Filter */}
                <select
                  value={empDeptFilter}
                  onChange={(e) => { setEmpDeptFilter(e.target.value); setEmpPage(1); }}
                  className="px-3.5 py-2 border border-odoo-border focus-ring text-sm rounded-lg bg-white text-odoo-textPrimary"
                >
                  <option value="">All Departments</option>
                  {allDeptsList?.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <DataTable
              columns={employeeColumns}
              data={empsData?.data || []}
              isLoading={isEmpsLoading}
              sortBy={empSort}
              sortOrder={empOrder}
              onSort={(field, order) => { setEmpSort(field); setEmpOrder(order); }}
              page={empPage}
              totalPages={empsData?.meta?.totalPages || 1}
              totalCount={empsData?.meta?.total || 0}
              onPageChange={setEmpPage}
            />
          </div>
        )}

      </div>

      {/* ==========================================
          MODALS & DRAWERS
          ========================================== */}

      {/* Department Creation / Modification Modal */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => { setIsDeptModalOpen(false); setEditingDept(null); }}
        title={editingDept ? `Edit Department: ${editingDept.code}` : 'Create Department'}
      >
        <form onSubmit={handleSubmitDept((data) => deptMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-odoo-textPrimary mb-1.5">Department Name</label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 bg-white border border-odoo-border rounded-lg text-sm focus-ring placeholder-gray-400"
              placeholder="e.g. Information Technology"
              {...registerDept('name')}
            />
            {deptErrors.name && <p className="mt-1 text-xs text-red-500 font-semibold">{deptErrors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-odoo-textPrimary mb-1.5">Unique Code</label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 bg-white border border-odoo-border rounded-lg text-sm focus-ring placeholder-gray-400 uppercase"
                placeholder="e.g. IT"
                {...registerDept('code')}
              />
              {deptErrors.code && <p className="mt-1 text-xs text-red-500 font-semibold">{deptErrors.code.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-odoo-textPrimary mb-1.5">Parent Department</label>
              <select
                className="w-full px-3.5 py-2.5 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                {...registerDept('parentDepartmentId')}
              >
                <option value="">None (Top Level)</option>
                {allDeptsList
                  ?.filter((d) => !editingDept || d.id !== editingDept.id)
                  ?.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-odoo-textPrimary mb-1.5">Department Head</label>
            <select
              className="w-full px-3.5 py-2.5 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              {...registerDept('headId')}
            >
              <option value="">Select Department Head (optional)</option>
              {allEmpsList?.map((e) => (
                <option key={e.uuid} value={e.uuid}>{e.name} ({e.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-odoo-textPrimary mb-1.5">Description</label>
            <textarea
              className="w-full px-3.5 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring placeholder-gray-400"
              rows={3}
              placeholder="Provide a brief summary of this department's functions..."
              {...registerDept('description')}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-odoo-border">
            <button
              type="button"
              onClick={() => { setIsDeptModalOpen(false); setEditingDept(null); }}
              className="px-4 py-2 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 rounded-lg text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deptMutation.isPending}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold transition-all-custom flex items-center gap-1.5"
            >
              {deptMutation.isPending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Asset Category Creation / Modification Modal */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => { setIsCatModalOpen(false); setEditingCat(null); }}
        title={editingCat ? `Edit Category: ${editingCat.name}` : 'Create Asset Category'}
      >
        <form onSubmit={handleSubmitCat((data) => catMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-odoo-textPrimary mb-1.5">Category Name</label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 bg-white border border-odoo-border rounded-lg text-sm focus-ring placeholder-gray-400"
              placeholder="e.g. Laptops & Mobile Devices"
              {...registerCat('name')}
            />
            {catErrors.name && <p className="mt-1 text-xs text-red-500 font-semibold">{catErrors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-odoo-textPrimary mb-1.5">Warranty (Months)</label>
              <input
                type="number"
                className="w-full px-3.5 py-2.5 bg-white border border-odoo-border rounded-lg text-sm focus-ring placeholder-gray-400"
                placeholder="e.g. 36"
                {...registerCat('warrantyMonths')}
              />
              {catErrors.warrantyMonths && <p className="mt-1 text-xs text-red-500 font-semibold">{catErrors.warrantyMonths.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-odoo-textPrimary mb-1.5">Depreciation (Years)</label>
              <input
                type="number"
                className="w-full px-3.5 py-2.5 bg-white border border-odoo-border rounded-lg text-sm focus-ring placeholder-gray-400"
                placeholder="e.g. 5"
                {...registerCat('depreciationYears')}
              />
              {catErrors.depreciationYears && <p className="mt-1 text-xs text-red-500 font-semibold">{catErrors.depreciationYears.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-odoo-textPrimary mb-1.5">Description</label>
            <textarea
              className="w-full px-3.5 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring placeholder-gray-400"
              rows={3}
              placeholder="e.g. Office computers, mobile phones, and portable hardware assets..."
              {...registerCat('description')}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-odoo-border">
            <button
              type="button"
              onClick={() => { setIsCatModalOpen(false); setEditingCat(null); }}
              className="px-4 py-2 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 rounded-lg text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={catMutation.isPending}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold transition-all-custom flex items-center gap-1.5"
            >
              {catMutation.isPending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {editingCat ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Employee Detail & Settings Drawer */}
      <Drawer
        isOpen={isEmpDrawerOpen}
        onClose={() => { setIsEmpDrawerOpen(false); setSelectedEmp(null); }}
        title="Employee Profile Management"
      >
        {selectedEmp && (
          <div className="space-y-6">
            
            {/* Header profile cards */}
            <div className="flex items-center gap-4.5 bg-odoo-bg p-4.5 rounded-xl border border-odoo-border shadow-sm">
              <div className="w-14 h-14 rounded-full bg-primary text-white text-lg font-extrabold flex items-center justify-center shadow-md uppercase">
                {getInitials(selectedEmp.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold text-odoo-textPrimary truncate">{selectedEmp.name}</h3>
                <span className="text-xs text-odoo-textSecondary flex items-center gap-1.5 mt-1">
                  <Mail className="w-3.5 h-3.5" />
                  {selectedEmp.email}
                </span>
              </div>
            </div>

            {/* General Profile fields */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-odoo-textSecondary">Staff Information</h4>
              <div className="border border-odoo-border rounded-xl divide-y divide-odoo-border text-sm overflow-hidden">
                <div className="grid grid-cols-2 p-3.5">
                  <span className="text-odoo-textSecondary font-medium">Unique UUID</span>
                  <span className="font-mono text-xs text-odoo-textPrimary text-right truncate" title={selectedEmp.uuid}>
                    {selectedEmp.uuid}
                  </span>
                </div>
                <div className="grid grid-cols-2 p-3.5 items-center">
                  <span className="text-odoo-textSecondary font-medium">Status</span>
                  <span className="text-right">
                    <StatusBadge status={selectedEmp.status} />
                  </span>
                </div>
                <div className="grid grid-cols-2 p-3.5">
                  <span className="text-odoo-textSecondary font-medium">Date Joined</span>
                  <span className="text-odoo-textPrimary font-semibold text-right">
                    {new Date(selectedEmp.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Administration controls */}
            <div className="space-y-4 pt-4 border-t border-odoo-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-odoo-textSecondary flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Administrative Actions
              </h4>

              {/* Assign Department */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-odoo-textPrimary">Assign Department</label>
                <select
                  value={selectedEmp.departmentId || ''}
                  onChange={(e) => empDeptMutation.mutate({ id: selectedEmp.uuid, departmentId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                >
                  <option value="">Unassigned (No Department)</option>
                  {allDeptsList?.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              {/* Promote Role */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-odoo-textPrimary">Security Role</label>
                <select
                  value={selectedEmp.role}
                  onChange={(e) => triggerEmpRolePromotion(selectedEmp, e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-odoo-border rounded-lg text-sm focus-ring font-semibold"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ASSET_MANAGER">Asset Manager</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="ADMIN">System Admin</option>
                </select>
              </div>

              {/* Deactivate account */}
              <div className="pt-2">
                <button
                  onClick={() => triggerEmpStatusToggle(selectedEmp)}
                  className={`w-full py-2.5 border rounded-lg text-sm font-semibold transition-all-custom ${
                    selectedEmp.status === 'ACTIVE'
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-green-200 text-green-600 hover:bg-green-50'
                  }`}
                >
                  {selectedEmp.status === 'ACTIVE' ? 'Deactivate Account' : 'Reactivate Account'}
                </button>
              </div>
            </div>

          </div>
        )}
      </Drawer>

      {/* Global Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
      />
    </DashboardLayout>
  );
};

export default OrgSetup;
