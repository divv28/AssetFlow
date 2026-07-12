import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import Drawer from '../components/Drawer';
import StatusBadge from '../components/StatusBadge';
import { 
  Wrench, AlertTriangle, Users, ClipboardCheck, Play, CheckCircle2, 
  Plus, Search, ShieldAlert, FileText, UserCheck, X, FileUp, 
  MessageSquare, Calendar, ChevronRight, Eye
} from 'lucide-react';

export const MaintenanceBoard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';
  
  // UI states
  const [isRequestDrawerOpen, setIsRequestDrawerOpen] = useState(false);
  const [isAssignDrawerOpen, setIsAssignDrawerOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Search/Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Dragging states
  const [draggedRequestId, setDraggedRequestId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Form states
  const [requestForm, setRequestForm] = useState({
    assetId: '',
    priority: 'MEDIUM',
    description: '',
    photo: '',
  });

  const [assignForm, setAssignForm] = useState({
    technicianId: '',
  });

  const [resolveForm, setResolveForm] = useState({
    resolutionNotes: '',
  });

  const [rejectReason, setRejectReason] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  // Columns definition for Kanban
  const KANBAN_COLUMNS = [
    { id: 'PENDING', label: 'Pending Approval', color: 'border-yellow-400 bg-yellow-50/50' },
    { id: 'APPROVED', label: 'Approved', color: 'border-blue-400 bg-blue-50/50' },
    { id: 'TECHNICIAN_ASSIGNED', label: 'Technician Assigned', color: 'border-purple-400 bg-purple-50/50' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-orange-400 bg-orange-50/50' },
    { id: 'RESOLVED', label: 'Resolved', color: 'border-green-400 bg-green-50/50' },
  ];

  // Queries
  // 1. Fetch Maintenance Requests
  const { data: requestsData, isLoading: isRequestsLoading } = useQuery({
    queryKey: ['maintenance', search, priorityFilter],
    queryFn: async () => {
      const params = { limit: 100, search, priority: priorityFilter };
      const res = await api.get('/api/maintenance', { params });
      return res.data.data;
    },
  });

  // 2. Fetch Assets for Dropdown
  const { data: assets } = useQuery({
    queryKey: ['assets-for-maintenance'],
    queryFn: async () => {
      const res = await api.get('/api/assets', { params: { limit: 200 } });
      return res.data.data;
    },
  });

  // 3. Fetch Technicians/Employees
  const { data: technicians } = useQuery({
    queryKey: ['technicians-list'],
    queryFn: async () => {
      const res = await api.get('/api/employees', { params: { limit: 100, status: 'ACTIVE' } });
      return res.data.data;
    },
  });

  // Mutations
  const createRequestMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/api/maintenance', payload);
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Maintenance request raised successfully!');
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsRequestDrawerOpen(false);
      resetRequestForm();
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to submit maintenance request');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.patch(`/api/maintenance/${id}`, { status });
      return res.data.data;
    },
    onSuccess: (data) => {
      addToast('success', `Status updated to ${data.status.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Unauthorized or invalid status transition');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.patch(`/api/maintenance/${id}/approve`);
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Request approved. Asset is now Under Maintenance.');
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      if (selectedRequest) setIsDetailsOpen(false);
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to approve');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const res = await api.patch(`/api/maintenance/${id}/reject`, { rejectedReason: reason });
      return res.data.data;
    },
    onSuccess: () => {
      addToast('warning', 'Maintenance request rejected');
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsRejectOpen(false);
      setRejectReason('');
      if (selectedRequest) setIsDetailsOpen(false);
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to reject');
    },
  });

  const assignTechMutation = useMutation({
    mutationFn: async ({ id, technicianId }) => {
      const res = await api.patch(`/api/maintenance/${id}/assign-technician`, { technicianId });
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Technician assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setIsAssignDrawerOpen(false);
      setAssignForm({ technicianId: '' });
      if (selectedRequest) setIsDetailsOpen(false);
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to assign technician');
    },
  });

  const startMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.patch(`/api/maintenance/${id}/start`);
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Repair work started!');
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      if (selectedRequest) setIsDetailsOpen(false);
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to start maintenance');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolutionNotes }) => {
      const res = await api.patch(`/api/maintenance/${id}/resolve`, { resolutionNotes });
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Asset maintenance resolved. Asset returned to inventory.');
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsResolveModalOpen(false);
      setResolveForm({ resolutionNotes: '' });
      if (selectedRequest) setIsDetailsOpen(false);
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to resolve request');
    },
  });

  // Helpers
  const resetRequestForm = () => {
    setRequestForm({ assetId: '', priority: 'MEDIUM', description: '', photo: '' });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!requestForm.assetId || !requestForm.description) {
      addToast('error', 'Asset and issue description are required');
      return;
    }
    createRequestMutation.mutate(requestForm);
  };

  // Drag and Drop implementation
  const handleDragStart = (e, id) => {
    setDraggedRequestId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    setDragOverColumn(colId);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedRequestId;
    setDragOverColumn(null);

    if (id) {
      // Find request status to check if it's actually changing
      const req = requestsData?.find(r => r.id === id);
      if (req && req.status !== targetStatus) {
        // Enforce transition validations or handle approvals separately
        if (targetStatus === 'APPROVED' && req.status === 'PENDING') {
          approveMutation.mutate(id);
        } else if (targetStatus === 'RESOLVED') {
          setSelectedRequest(req);
          setIsResolveModalOpen(true);
        } else if (targetStatus === 'IN_PROGRESS' && req.status === 'TECHNICIAN_ASSIGNED') {
          startMutation.mutate(id);
        } else if (targetStatus === 'TECHNICIAN_ASSIGNED' && req.status === 'APPROVED') {
          setSelectedRequest(req);
          setIsAssignDrawerOpen(true);
        } else {
          updateStatusMutation.mutate({ id, status: targetStatus });
        }
      }
    }
    setDraggedRequestId(null);
  };

  const getPriorityBadgeType = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW':
      default:
        return 'neutral';
    }
  };

  return (
    <DashboardLayout
      title="Maintenance Management"
      breadcrumbs={[{ label: 'Home', path: '/dashboard' }, { label: 'Maintenance Requests' }]}
    >
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Top filter dashboard banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search issues, asset tags, asset name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-odoo-border rounded-lg text-xs bg-white focus-ring"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-odoo-border rounded-lg text-xs font-semibold bg-white text-odoo-textPrimary focus-ring"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <button
              onClick={() => { resetRequestForm(); setIsRequestDrawerOpen(true); }}
              className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow"
            >
              <Plus className="w-4 h-4" />
              Raise Request
            </button>
          </div>
        </div>

        {/* Kanban Columns */}
        {isRequestsLoading ? (
          <div className="py-20 text-center text-xs text-odoo-textSecondary">Loading maintenance board...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto min-h-[600px] items-start pb-10">
            {KANBAN_COLUMNS.map((col) => {
              const colRequests = requestsData?.filter(r => r.status === col.id) || [];
              const isOver = dragOverColumn === col.id;
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={() => setDragOverColumn(null)}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`flex flex-col border border-dashed border-odoo-border rounded-card p-3 min-h-[500px] w-full transition-all ${
                    isOver ? 'bg-primary-light/50 border-primary scale-[1.01]' : 'bg-white'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-odoo-border mb-3 px-1">
                    <span className="text-xs font-bold text-odoo-textPrimary uppercase tracking-wider">{col.label}</span>
                    <span className="text-[10px] font-extrabold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                      {colRequests.length}
                    </span>
                  </div>

                  {/* Cards list */}
                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[700px] p-0.5">
                    {colRequests.length === 0 ? (
                      <div className="h-full flex items-center justify-center py-10">
                        <span className="text-[10px] text-gray-400 italic">Drag cards here</span>
                      </div>
                    ) : (
                      colRequests.map((req) => (
                        <div
                          key={req.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, req.id)}
                          className="bg-white border border-odoo-border hover:border-primary rounded-xl p-4 shadow-sm hover:shadow cursor-grab active:cursor-grabbing transition-all space-y-3 relative group"
                        >
                          {/* Card details */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-mono text-[9px] bg-primary-light text-primary border border-primary/20 px-1.5 py-0.5 rounded">
                                {req.asset.assetTag}
                              </span>
                              <StatusBadge type={getPriorityBadgeType(req.priority)} label={req.priority} />
                            </div>
                            <h4 className="font-bold text-xs text-odoo-textPrimary pt-1 line-clamp-1">{req.asset.name}</h4>
                            <p className="text-[11px] text-odoo-textSecondary line-clamp-2">{req.description}</p>
                          </div>

                          <div className="border-t border-odoo-border pt-2 flex items-center justify-between text-[9.5px] text-gray-400">
                            <span>Raised by: {req.raisedBy.name.split(' ')[0]}</span>
                            <button
                              onClick={() => { setSelectedRequest(req); setIsDetailsOpen(true); }}
                              className="p-1 hover:bg-gray-100 rounded text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                              title="View details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Raise Request Drawer */}
      <Drawer
        isOpen={isRequestDrawerOpen}
        onClose={() => { setIsRequestDrawerOpen(false); resetRequestForm(); }}
        title="Raise Maintenance Request"
      >
        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs pb-20">
          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Select Asset *</label>
            <select
              value={requestForm.assetId}
              onChange={(e) => setRequestForm(prev => ({ ...prev, assetId: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
              required
            >
              <option value="">Choose Asset</option>
              {assets?.map(ass => (
                <option key={ass.id} value={ass.id}>
                  {ass.name} ({ass.assetTag}) - Status: {ass.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Priority *</label>
            <select
              value={requestForm.priority}
              onChange={(e) => setRequestForm(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Explain the Issue *</label>
            <textarea
              rows="4"
              placeholder="Describe the failure or repair needed..."
              value={requestForm.description}
              onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
              required
            ></textarea>
          </div>

          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Attach Photo URL</label>
            <input
              type="text"
              placeholder="http://example.com/asset-photo.jpg"
              value={requestForm.photo}
              onChange={(e) => setRequestForm(prev => ({ ...prev, photo: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
            />
          </div>

          <div className="absolute bottom-0 right-0 max-w-md w-full bg-white border-t border-odoo-border p-4 flex gap-3 z-10 shrink-0">
            <button
              type="button"
              onClick={() => setIsRequestDrawerOpen(false)}
              className="flex-1 py-2.5 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 text-sm font-bold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRequestMutation.isPending}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow"
            >
              {createRequestMutation.isPending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Raise Request
            </button>
          </div>
        </form>
      </Drawer>

      {/* Assign Technician Drawer */}
      <Drawer
        isOpen={isAssignDrawerOpen}
        onClose={() => { setIsAssignDrawerOpen(false); setAssignForm({ technicianId: '' }); }}
        title="Assign Technician"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!assignForm.technicianId) return;
          assignTechMutation.mutate({ id: selectedRequest.id, technicianId: assignForm.technicianId });
        }} className="p-6 space-y-4 text-xs pb-20">
          <div>
            <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Select technician *</label>
            <select
              value={assignForm.technicianId}
              onChange={(e) => setAssignForm({ technicianId: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
              required
            >
              <option value="">Choose Employee</option>
              {technicians?.map(tech => (
                <option key={tech.uuid} value={tech.uuid}>
                  {tech.name} ({tech.email}) {tech.role === 'ASSET_MANAGER' ? '- Manager' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="absolute bottom-0 right-0 max-w-md w-full bg-white border-t border-odoo-border p-4 flex gap-3 z-10 shrink-0">
            <button
              type="button"
              onClick={() => setIsAssignDrawerOpen(false)}
              className="flex-1 py-2.5 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 text-sm font-bold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignTechMutation.isPending}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
            >
              {assignTechMutation.isPending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Assign Tech
            </button>
          </div>
        </form>
      </Drawer>

      {/* Resolution Notes Modal */}
      {isResolveModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsResolveModalOpen(false)}></div>
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <h3 className="text-sm font-black text-odoo-textPrimary">Resolve Maintenance request</h3>
            <p className="text-[11px] text-odoo-textSecondary">Provide repair/resolution details before marking as resolved.</p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!resolveForm.resolutionNotes.trim()) return;
              resolveMutation.mutate({ id: selectedRequest.id, resolutionNotes: resolveForm.resolutionNotes });
            }} className="space-y-3">
              <textarea
                rows="3"
                placeholder="Specify what was fixed, parts replaced, etc."
                value={resolveForm.resolutionNotes}
                onChange={(e) => setResolveForm({ resolutionNotes: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-xs focus-ring"
                required
              ></textarea>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="flex-1 py-2 border border-odoo-border rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveMutation.isPending}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  {resolveMutation.isPending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  Resolve Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details & Action Modal */}
      {isDetailsOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDetailsOpen(false)}></div>
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-primary uppercase bg-primary-light px-2 py-0.5 rounded border border-primary/20 font-mono">
                  {selectedBooking?.resource?.category || selectedRequest.asset.assetTag}
                </span>
                <h3 className="text-sm font-black text-odoo-textPrimary">{selectedRequest.asset.name}</h3>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="p-1 hover:bg-gray-100 rounded-md text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photos */}
            {selectedRequest.photo && (
              <img src={selectedRequest.photo} className="w-full h-40 object-cover rounded-xl border border-odoo-border" alt="Asset Fail details" />
            )}

            {/* Info panel */}
            <div className="bg-odoo-bg border border-odoo-border rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-odoo-textSecondary">Raised By:</span>
                <span className="font-bold text-odoo-textPrimary">{selectedRequest.raisedBy.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-odoo-textSecondary">Priority:</span>
                <span className="font-bold"><StatusBadge type={getPriorityBadgeType(selectedRequest.priority)} label={selectedRequest.priority} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-odoo-textSecondary">Status:</span>
                <span className="font-bold uppercase text-primary">{selectedRequest.status.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-odoo-textSecondary">Technician:</span>
                <span className="font-bold text-odoo-textPrimary">{selectedRequest.technician?.name || 'Unassigned'}</span>
              </div>
              {selectedRequest.description && (
                <div className="border-t border-odoo-border pt-2 mt-2">
                  <span className="text-odoo-textSecondary block font-bold mb-1">Issue Details:</span>
                  <span className="text-odoo-textPrimary block italic font-semibold">"{selectedRequest.description}"</span>
                </div>
              )}
              {selectedRequest.resolutionNotes && (
                <div className="border-t border-odoo-border pt-2 mt-2 bg-green-50/50 p-2 rounded-lg border">
                  <span className="text-green-700 block font-bold mb-0.5">Resolution Notes:</span>
                  <span className="text-odoo-textPrimary block font-semibold">{selectedRequest.resolutionNotes}</span>
                </div>
              )}
            </div>

            {/* Transition Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {isAdminOrManager && selectedRequest.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => approveMutation.mutate(selectedRequest.id)}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setIsRejectOpen(true)}
                    className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    Reject
                  </button>
                </>
              )}

              {isAdminOrManager && ['APPROVED', 'TECHNICIAN_ASSIGNED'].includes(selectedRequest.status) && (
                <button
                  onClick={() => setIsAssignDrawerOpen(true)}
                  className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {selectedRequest.technicianId ? 'Reassign Tech' : 'Assign Tech'}
                </button>
              )}

              {selectedRequest.status === 'TECHNICIAN_ASSIGNED' && (selectedRequest.technicianId === user.uuid || isAdminOrManager) && (
                <button
                  onClick={() => startMutation.mutate(selectedRequest.id)}
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Start Work
                </button>
              )}

              {selectedRequest.status === 'IN_PROGRESS' && (selectedRequest.technicianId === user.uuid || isAdminOrManager) && (
                <button
                  onClick={() => setIsResolveModalOpen(true)}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsRejectOpen(false)}></div>
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <h3 className="text-sm font-black text-odoo-textPrimary">Reject request</h3>
            <textarea
              rows="3"
              placeholder="Specify rejection details..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-xs focus-ring"
              required
            ></textarea>
            <div className="flex gap-2">
              <button onClick={() => setIsRejectOpen(false)} className="flex-1 py-2 border rounded-lg text-xs">Cancel</button>
              <button
                onClick={() => rejectMutation.mutate({ id: selectedRequest.id, reason: rejectReason })}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default MaintenanceBoard;
