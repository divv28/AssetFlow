import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

import DashboardLayout from '../layouts/DashboardLayout';
import RegisterAssetDrawer from '../components/RegisterAssetDrawer';
import StatusBadge from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

import { 
  Building2, Laptop, User, Calendar, ShieldCheck, DollarSign, 
  MapPin, ClipboardList, Clock, Paperclip, QrCode, FileText, 
  ChevronRight, ArrowLeft, Edit, Download, Printer, Copy, Upload, Plus 
} from 'lucide-react';

export const AssetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';
  const isAuthorizedToEdit = isAdminOrManager || user?.role === 'DEPARTMENT_HEAD';

  // Allocation state
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [allocateEmployeeId, setAllocateEmployeeId] = useState('');
  const [allocateReason, setAllocateReason] = useState('');

  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  
  // Status manual modification
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  // Local document upload
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch Asset details
  const { data: asset, isLoading: isAssetLoading, error } = useQuery({
    queryKey: ['asset-details', id],
    queryFn: async () => {
      const res = await api.get(`/api/assets/${id}`);
      return res.data.data;
    },
  });

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ toStatus, reason }) => {
      const res = await api.patch(`/api/assets/${id}/status`, { toStatus, reason });
      return res.data.data;
    },
    onSuccess: (data) => {
      addToast('success', `Lifecycle status changed to ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ['asset-details', id] });
      setIsStatusOpen(false);
      setStatusReason('');
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to update status');
    },
  });

  // Fetch employees list
  const { data: employees } = useQuery({
    queryKey: ['employees-allocation-list-details', user?.departmentId],
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

  // Allocation mutation
  const allocateMutation = useMutation({
    mutationFn: async ({ allocatedToId, reason }) => {
      const res = await api.patch(`/api/assets/${id}/allocate`, { allocatedToId, reason });
      return res.data.data;
    },
    onSuccess: (data) => {
      addToast('success', data.allocatedToId ? 'Asset successfully distributed' : 'Asset successfully returned to inventory');
      queryClient.invalidateQueries({ queryKey: ['asset-details', id] });
      setIsAllocateOpen(false);
      setAllocateEmployeeId('');
      setAllocateReason('');
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to distribute asset');
    },
  });

  // Document upload mutation
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      await api.post(`/api/assets/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addToast('success', 'Document uploaded and attached successfully');
      queryClient.invalidateQueries({ queryKey: ['asset-details', id] });
      setUploadFile(null);
    } catch (err) {
      addToast('error', err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Print QR Helper
  const handlePrintQr = () => {
    const printWindow = window.open(`/api/assets/${id}/qr`, '_blank', 'width=450,height=450');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  // Copy Tag helper
  const handleCopyTag = () => {
    if (!asset) return;
    navigator.clipboard.writeText(asset.assetTag);
    addToast('success', 'Asset tag copied to clipboard');
  };

  if (isAssetLoading) {
    return (
      <DashboardLayout title="Asset Details" breadcrumbs={[{ label: 'Assets', path: '/assets' }, { label: 'Loading...' }]}>
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
          <LoadingSkeleton rows={5} />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Error" breadcrumbs={[{ label: 'Assets', path: '/assets' }, { label: 'Not Found' }]}>
        <div className="p-6 md:p-8 max-w-md mx-auto text-center space-y-4">
          <div className="text-red-500 text-5xl font-bold">⚠️</div>
          <h1 className="text-xl font-bold text-odoo-textPrimary">Access Denied or Asset Not Found</h1>
          <p className="text-sm text-odoo-textSecondary">
            {error.response?.data?.message || 'You do not have authorization to view this asset or the ID is invalid.'}
          </p>
          <Link to="/assets" className="inline-block px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover">
            Back to Directory
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Merge activity timeline
  const formatTimelineAction = (action) => {
    switch (action) {
      case 'ASSET_CREATED': return 'Asset Registered';
      case 'ASSET_UPDATED': return 'Asset Specifications Updated';
      case 'ASSET_DUPLICATED': return 'Asset Duplicated';
      case 'ASSET_SOFT_DELETED': return 'Asset Soft-Deleted';
      case 'ASSET_DOCUMENT_UPLOADED': return 'Media Document Uploaded';
      case 'ASSET_STATUS_CHANGED': return 'Lifecycle Status Changed';
      default: return action;
    }
  };

  const timelineItems = [
    ...(asset.statusHistory || []).map((h) => ({
      id: h.id,
      date: new Date(h.createdAt),
      title: `Status change: ${h.fromStatus || 'NONE'} → ${h.toStatus}`,
      user: h.changer?.name || 'System',
      detail: h.reason || 'No explanation provided',
      badge: 'status',
    })),
    ...(asset.auditLogs || []).map((a) => ({
      id: a.id,
      date: new Date(a.createdAt),
      title: formatTimelineAction(a.action),
      user: a.actor?.name || 'Administrator',
      detail: a.action === 'ASSET_UPDATED' ? 'Details edited by system architect.' : a.metadata?.reason || '',
      badge: 'audit',
    })),
  ].sort((a, b) => b.date - a.date);

  const getStatusBadgeType = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'success';
      case 'ALLOCATED': return 'info';
      case 'RESERVED': return 'warning';
      case 'UNDER_MAINTENANCE': return 'danger';
      case 'LOST': return 'danger';
      case 'RETIRED':
      default: return 'neutral';
    }
  };

  const primaryPhoto = asset.documents?.find(d => d.fileType === 'photo');

  return (
    <DashboardLayout
      title={`Asset Details: ${asset.assetTag}`}
      breadcrumbs={[
        { label: 'Home', path: '/dashboard' },
        { label: 'Assets', path: '/assets' },
        { label: asset.assetTag },
      ]}
    >
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        
        {/* Back Link */}
        <Link to="/assets" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Assets Directory</span>
        </Link>

        {/* Hero Card */}
        <div className="bg-white rounded-card border border-odoo-border shadow-sm p-6 flex flex-col md:flex-row gap-6 items-start">
          {/* Photo */}
          <div className="w-full md:w-36 h-36 rounded-xl border border-odoo-border overflow-hidden shrink-0 bg-odoo-bg flex items-center justify-center relative">
            {primaryPhoto ? (
              <img src={primaryPhoto.fileUrl} className="w-full h-full object-cover" alt="Asset" />
            ) : (
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center p-4">
                No Photo Uploaded
              </div>
            )}
          </div>

          {/* Core Info */}
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-odoo-textPrimary truncate">{asset.name}</h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 border border-primary/20 bg-primary-light/10 text-primary rounded">
                {asset.assetTag}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge type={getStatusBadgeType(asset.status)} label={asset.status} />
              <span className="text-[10px] font-bold px-2 py-0.5 border border-odoo-border rounded bg-odoo-bg text-odoo-textPrimary uppercase">
                Condition: {asset.condition}
              </span>
            </div>

            {asset.allocatedTo && (
              <div className="flex items-center gap-2 mt-2 px-3 py-1.5 border border-blue-100 bg-blue-50/50 rounded-lg max-w-md">
                <User className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="font-semibold text-blue-800 uppercase block text-[9px]">Assigned/Distributed To</span>
                  <span className="font-bold text-blue-900">{asset.allocatedTo.name} ({asset.allocatedTo.email})</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-dashed border-odoo-border text-xs text-odoo-textSecondary">
              <div>
                <span className="font-semibold block uppercase text-[9px] text-gray-400">Category</span>
                <span className="font-bold text-odoo-textPrimary">{asset.category?.name}</span>
              </div>
              <div>
                <span className="font-semibold block uppercase text-[9px] text-gray-400">Department</span>
                <span className="font-bold text-odoo-textPrimary">{asset.department?.name || 'Global'}</span>
              </div>
              <div>
                <span className="font-semibold block uppercase text-[9px] text-gray-400">Location</span>
                <span className="font-bold text-odoo-textPrimary">{asset.location || '—'}</span>
              </div>
              <div>
                <span className="font-semibold block uppercase text-[9px] text-gray-400">Manufacturer</span>
                <span className="font-bold text-odoo-textPrimary">{asset.manufacturer || '—'}</span>
              </div>
            </div>
          </div>

          {/* QR Code Action Panel */}
          <div className="bg-odoo-bg border border-odoo-border rounded-xl p-4 flex flex-col items-center justify-center shrink-0 w-full md:w-auto text-center gap-2">
            <div 
              onClick={() => setIsZoomOpen(true)}
              className="w-20 h-20 bg-white border border-odoo-border rounded-lg flex items-center justify-center cursor-zoom-in hover:scale-105 transition-transform p-1.5"
              title="Click to zoom"
            >
              <img src={`/api/assets/${id}/qr`} className="w-full h-full" alt="QR Code" />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`/api/assets/${id}/qr`, '_blank')}
                className="p-1.5 bg-white border border-odoo-border hover:border-primary rounded-md text-odoo-textPrimary hover:text-primary transition-colors"
                title="Download QR PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handlePrintQr}
                className="p-1.5 bg-white border border-odoo-border hover:border-primary rounded-md text-odoo-textPrimary hover:text-primary transition-colors"
                title="Print QR"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopyTag}
                className="p-1.5 bg-white border border-odoo-border hover:border-primary rounded-md text-odoo-textPrimary hover:text-primary transition-colors"
                title="Copy Asset Tag"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Quick Top Actions panel */}
        {isAuthorizedToEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="px-4 py-2.5 bg-white border border-odoo-border text-odoo-textPrimary font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Edit className="w-4 h-4 text-primary" />
              <span>Edit Specifications</span>
            </button>

            <button
              onClick={() => setIsStatusOpen(true)}
              className="px-4 py-2.5 bg-white border border-odoo-border text-odoo-textPrimary font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Change Status</span>
            </button>

            {(asset.status === 'AVAILABLE' || asset.status === 'RESERVED') && (
              <button
                onClick={() => setIsAllocateOpen(true)}
                className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-sm flex items-center gap-2 transition-all-custom shadow-md hover:shadow-lg"
              >
                <User className="w-4 h-4" />
                <span>Distribute Asset</span>
              </button>
            )}

            {asset.status === 'ALLOCATED' && (
              <button
                onClick={() => {
                  setAllocateEmployeeId('');
                  setAllocateReason('');
                  allocateMutation.mutate({ allocatedToId: null, reason: 'Returned to inventory' });
                }}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-sm flex items-center gap-2 transition-all-custom shadow-md hover:shadow-lg"
              >
                <User className="w-4 h-4" />
                <span>Return Asset</span>
              </button>
            )}
          </div>
        )}

        {/* Tabs navigation panel */}
        <div className="border-b border-odoo-border flex gap-4 overflow-x-auto shrink-0 bg-white p-2 rounded-lg border">
          {[
            { id: 'overview', label: 'Overview Specifications', icon: FileText },
            { id: 'allocation', label: 'Allocation History', icon: User },
            { id: 'maintenance', label: 'Maintenance History', icon: ShieldCheck },
            { id: 'documents', label: 'Documents & Media', icon: Paperclip },
            { id: 'timeline', label: 'Activity Timeline', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                  isTabActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-odoo-textSecondary hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Areas */}
        <div className="bg-white border border-odoo-border rounded-card p-6 shadow-sm min-h-64">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-odoo-border">
              
              {/* Specs Column */}
              <div className="space-y-4 pr-0 md:pr-6">
                <h3 className="text-sm font-bold text-odoo-textPrimary uppercase border-b border-odoo-border pb-1">
                  Specifications Details
                </h3>
                <table className="w-full text-xs border border-odoo-border rounded-lg overflow-hidden divide-y divide-odoo-border">
                  <tbody className="divide-y divide-odoo-border bg-white">
                    <tr>
                      <td className="px-4 py-2.5 bg-odoo-bg text-odoo-textSecondary font-semibold w-1/3">Serial Number</td>
                      <td className="px-4 py-2.5 font-bold text-odoo-textPrimary font-mono">{asset.serialNumber || '—'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 bg-odoo-bg text-odoo-textSecondary font-semibold">Manufacturer</td>
                      <td className="px-4 py-2.5 font-bold text-odoo-textPrimary">{asset.manufacturer || '—'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 bg-odoo-bg text-odoo-textSecondary font-semibold">Vendor / Supplier</td>
                      <td className="px-4 py-2.5 font-bold text-odoo-textPrimary">{asset.vendor || '—'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 bg-odoo-bg text-odoo-textSecondary font-semibold">Bookable (Shared)</td>
                      <td className="px-4 py-2.5 font-bold text-odoo-textPrimary">{asset.isBookable ? 'Yes' : 'No'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Purchase & Warranty Column */}
              <div className="space-y-4 pl-0 md:pl-6 pt-4 md:pt-0">
                <h3 className="text-sm font-bold text-odoo-textPrimary uppercase border-b border-odoo-border pb-1">
                  Financials & Warranty
                </h3>
                <table className="w-full text-xs border border-odoo-border rounded-lg overflow-hidden divide-y divide-odoo-border">
                  <tbody className="divide-y divide-odoo-border bg-white">
                    <tr>
                      <td className="px-4 py-2.5 bg-odoo-bg text-odoo-textSecondary font-semibold w-1/3">Acquisition Date</td>
                      <td className="px-4 py-2.5 font-bold text-odoo-textPrimary">
                        {asset.acquisitionDate ? new Date(asset.acquisitionDate).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 bg-odoo-bg text-odoo-textSecondary font-semibold">Acquisition Cost</td>
                      <td className="px-4 py-2.5 font-bold text-odoo-textPrimary">
                        {asset.acquisitionCost ? `$${parseFloat(asset.acquisitionCost).toLocaleString()}` : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 bg-odoo-bg text-odoo-textSecondary font-semibold">Warranty Expiration</td>
                      <td className="px-4 py-2.5 font-bold text-odoo-textPrimary">
                        {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 bg-odoo-bg text-odoo-textSecondary font-semibold">Registered By</td>
                      <td className="px-4 py-2.5 font-bold text-odoo-textPrimary truncate">{asset.creator?.name} ({asset.creator?.email})</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* Allocation History Placeholder */}
          {activeTab === 'allocation' && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
              <User className="w-10 h-10 text-gray-300" />
              <h4 className="text-xs font-bold text-odoo-textPrimary uppercase">No Allocation Records</h4>
              <p className="text-xs text-odoo-textSecondary leading-relaxed max-w-sm">
                Allocation history will populates automatically once the **Allocation & Transfer** module is shipped in Phase 5.
              </p>
            </div>
          )}

          {/* Maintenance History Placeholder */}
          {activeTab === 'maintenance' && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-gray-300" />
              <h4 className="text-xs font-bold text-odoo-textPrimary uppercase">No Maintenance Records</h4>
              <p className="text-xs text-odoo-textSecondary leading-relaxed max-w-sm">
                Maintenance history logs will populate automatically once the **Maintenance** module is shipped in Phase 6.
              </p>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              
              {/* Document List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-odoo-textSecondary uppercase tracking-wider">Attached Files</h4>
                {asset.documents?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {asset.documents.map((doc) => (
                      <div key={doc.id} className="p-3 border border-odoo-border rounded-xl flex items-center justify-between hover:bg-odoo-bg transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                            <FileText className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-odoo-textPrimary uppercase">{doc.fileType}</span>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-primary font-semibold hover:underline block truncate"
                            >
                              Open Attachment
                            </a>
                          </div>
                        </div>
                        <span className="text-[9px] text-odoo-textSecondary font-semibold">
                          Uploaded by: {doc.uploader?.name || 'System'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-odoo-border rounded-xl text-center text-xs text-odoo-textSecondary">
                    No documents attached to this asset yet.
                  </div>
                )}
              </div>

              {/* Upload Form for Admin/Managers */}
              {isAdminOrManager && (
                <form onSubmit={handleUploadDocument} className="border-t border-odoo-border pt-4 space-y-4 max-w-md">
                  <h4 className="text-xs font-bold text-odoo-textPrimary uppercase">Attach Additional Document</h4>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      className="flex-1 text-xs border border-odoo-border rounded-lg p-2 focus-ring file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-light file:text-primary file:cursor-pointer"
                    />
                    <button
                      type="submit"
                      disabled={!uploadFile || isUploading}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      {isUploading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* Activity Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="relative border-l border-odoo-border ml-3.5 pl-6 space-y-6 py-2">
              {timelineItems.map((item) => (
                <div key={item.id} className="relative">
                  {/* Dot */}
                  <span className="absolute -left-[30px] top-0 w-3 h-3 rounded-full border-2 border-white bg-primary ring-4 ring-primary-light/20 flex items-center justify-center"></span>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-odoo-textPrimary">{item.title}</span>
                      <span className="text-[10px] text-odoo-textSecondary">
                        ({item.date.toLocaleString()})
                      </span>
                    </div>
                    <p className="text-xs text-odoo-textSecondary leading-relaxed">
                      By <span className="font-bold text-odoo-textPrimary">{item.user}</span>: {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* Edit Specifications Drawer */}
      <RegisterAssetDrawer
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        assetId={id}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['asset-details', id] })}
      />

      {/* Zoom QR Code Modal */}
      {isZoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsZoomOpen(false)}></div>
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl p-6 max-w-sm w-full flex flex-col items-center gap-4 animate-scale-in">
            <h3 className="text-sm font-bold text-odoo-textPrimary uppercase">QR Code: {asset.assetTag}</h3>
            
            <div className="w-64 h-64 bg-white border border-odoo-border rounded-xl p-2 shrink-0">
              <img src={`/api/assets/${id}/qr`} className="w-full h-full" alt="Zoomed QR" />
            </div>

            <div className="flex gap-2 w-full">
              <button
                onClick={handlePrintQr}
                className="flex-1 py-2 border border-odoo-border hover:bg-gray-50 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={() => setIsZoomOpen(false)}
                className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Status Transition Modal */}
      {isStatusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsStatusOpen(false)}></div>
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <h3 className="text-base font-bold text-odoo-textPrimary">
              Change Lifecycle Status of {asset.assetTag}
            </h3>
            <p className="text-xs text-odoo-textSecondary">
              Current status: <span className="font-bold text-odoo-textPrimary">{asset.status}</span>
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
                onClick={() => setIsStatusOpen(false)}
                className="flex-1 py-2 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 text-xs font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newStatus || !statusReason.trim() || statusMutation.isPending}
                onClick={() => statusMutation.mutate({
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
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <h3 className="text-base font-bold text-odoo-textPrimary">
              Distribute Asset to Employee
            </h3>
            
            <div className="bg-odoo-bg border border-odoo-border rounded-lg p-3 text-xs text-odoo-textSecondary">
              <span className="block font-bold text-odoo-textPrimary">Asset Details:</span>
              <span>{asset.name} ({asset.assetTag})</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1.5 uppercase">Select Active Employee *</label>
                <select
                  value={allocateEmployeeId}
                  onChange={(e) => setAllocateEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring text-odoo-textPrimary font-semibold"
                >
                  <option value="">Choose Employee</option>
                  {employees?.map(emp => (
                    <option key={emp.uuid} value={emp.uuid}>
                      {emp.name} ({emp.email}) {emp.department ? `- ${emp.department.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-odoo-textSecondary mb-1.5 uppercase">Allocation Reason / Remarks *</label>
                <textarea
                  rows="3"
                  placeholder="Specify notes or allocation purpose..."
                  value={allocateReason}
                  onChange={(e) => setAllocateReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                ></textarea>
              </div>
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
                disabled={!allocateEmployeeId || !allocateReason.trim() || allocateMutation.isPending}
                onClick={() => allocateMutation.mutate({
                  allocatedToId: allocateEmployeeId,
                  reason: allocateReason.trim()
                })}
                className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                Allocate Asset
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default AssetDetails;
