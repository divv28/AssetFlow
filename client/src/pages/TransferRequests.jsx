import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

import DashboardLayout from '../layouts/DashboardLayout';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

import { 
  ShieldCheck, ArrowLeftRight, CornerDownLeft, History, 
  Check, X, Eye, MessageSquare, Calendar, Info 
} from 'lucide-react';

export const TransferRequests = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page')) || 1;

  // Modals/Popups state
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionTargetId, setActionTargetId] = useState(null);
  
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';
  const isHead = user?.role === 'DEPARTMENT_HEAD';

  // Fetch Transfer Requests
  const { data: transfersData, isLoading } = useQuery({
    queryKey: ['transfer-requests', page],
    queryFn: async () => {
      const res = await api.get('/api/allocations/transfers', { params: { page, limit: 10 } });
      return res.data;
    },
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.patch(`/api/allocations/transfers/${id}/approve`);
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Transfer request approved successfully. Asset is now reassigned.');
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to approve transfer request');
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const res = await api.patch(`/api/allocations/transfers/${id}/reject`, { rejectedReason: reason });
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Transfer request rejected. Underlying allocation remains active.');
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsRejectOpen(false);
      setRejectReason('');
      setActionTargetId(null);
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to reject transfer request');
    },
  });

  const handleApprove = (id) => {
    approveMutation.mutate(id);
  };

  const handleRejectClick = (id) => {
    setActionTargetId(id);
    setIsRejectOpen(true);
  };

  const handleRejectConfirm = (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      addToast('error', 'Please specify a rejection reason');
      return;
    }
    rejectMutation.mutate({ id: actionTargetId, reason: rejectReason.trim() });
  };

  const tableColumns = [
    {
      header: 'Asset Details',
      accessor: (row) => (
        <div>
          <span className="font-bold text-odoo-textPrimary block">{row.asset.name}</span>
          <span className="font-mono text-[10px] text-primary">{row.asset.assetTag}</span>
        </div>
      ),
    },
    {
      header: 'Current Holder',
      accessor: (row) => (
        <div>
          <span className="font-semibold block text-odoo-textPrimary">{row.currentHolder.name}</span>
          <span className="text-[10px] text-gray-400 block">{row.currentHolder.email}</span>
        </div>
      ),
    },
    {
      header: 'Proposed Holder',
      accessor: (row) => (
        <div>
          <span className="font-bold block text-primary">{row.newHolder.name}</span>
          <span className="text-[10px] text-gray-400 block">{row.newHolder.email}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => {
        let type = 'neutral';
        if (row.status === 'COMPLETED') type = 'success';
        if (row.status === 'REQUESTED') type = 'warning';
        if (row.status === 'REJECTED') type = 'danger';
        return <StatusBadge type={type} label={row.status} />;
      },
    },
    {
      header: 'Requested Date',
      accessor: (row) => <span className="text-xs">{new Date(row.requestedAt).toLocaleDateString()}</span>,
    },
    {
      header: 'Actions',
      accessor: (row) => {
        const canReview = isAdminOrManager || (isHead && (row.currentHolder.departmentId === user.departmentId || row.newHolder.departmentId === user.departmentId));
        const isPending = row.status === 'REQUESTED';

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDetailTarget(row);
                setIsDetailOpen(true);
              }}
              className="p-1.5 bg-gray-50 border border-odoo-border hover:bg-gray-100 rounded-lg text-odoo-textSecondary flex items-center gap-1 text-[11px]"
              title="View Details"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Details</span>
            </button>

            {isPending && canReview && (
              <>
                <button
                  onClick={() => handleApprove(row.id)}
                  disabled={approveMutation.isPending}
                  className="p-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-emerald-700 flex items-center gap-1 text-[11px] disabled:opacity-50"
                  title="Approve Transfer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => handleRejectClick(row.id)}
                  className="p-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg text-rose-700 flex items-center gap-1 text-[11px]"
                  title="Reject Transfer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout
      title="Transfer Requests Approval Control"
      breadcrumbs={[{ label: 'Home', path: '/dashboard' }, { label: 'Allocations & Transfers', path: '/allocations' }, { label: 'Transfer Requests' }]}
    >
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Tabs Header */}
        <div className="border-b border-odoo-border flex gap-4 overflow-x-auto shrink-0 bg-white p-2 rounded-lg border">
          <Link to="/allocations" className="px-4 py-2 rounded-lg text-xs font-bold text-odoo-textSecondary hover:bg-gray-50 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Allocation Dashboard</span>
          </Link>
          <Link to="/allocations/transfers" className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-white shadow-sm flex items-center gap-2">
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

        {/* Informative info banner for Department Heads */}
        {isHead && (
          <div className="p-4 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs flex gap-3 items-start shadow-sm">
            <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Department Head Review Enabled:</span>
              <span>You are authorized to approve or reject transfer requests where either the current holder or proposed target holder is within your department boundaries.</span>
            </div>
          </div>
        )}

        {/* Listings Table */}
        <div className="bg-white border border-odoo-border rounded-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton rows={5} />
            </div>
          ) : (
            <DataTable
              columns={tableColumns}
              data={transfersData?.data || []}
              pagination={transfersData?.meta}
              onPageChange={(p) => setSearchParams({ page: String(p) })}
            />
          )}
        </div>

      </div>

      {/* Reject Modal dialog */}
      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsRejectOpen(false)}></div>
          <form onSubmit={handleRejectConfirm} className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in text-xs">
            <h3 className="text-base font-bold text-odoo-textPrimary">
              Provide Rejection Reason
            </h3>

            <div>
              <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Specify Reason *</label>
              <textarea
                rows="3"
                placeholder="Why is this transfer request rejected?..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                required
              ></textarea>
            </div>

            <div className="flex gap-3 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="flex-1 py-2 border border-odoo-border text-odoo-textPrimary hover:bg-gray-50 text-sm font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Details Dialog Modal */}
      {isDetailOpen && detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)}></div>
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in text-xs">
            <h3 className="text-base font-bold text-odoo-textPrimary">
              Transfer Request Details
            </h3>

            <div className="divide-y divide-odoo-border text-odoo-textSecondary">
              <div className="py-2.5 flex justify-between">
                <span className="font-semibold">Asset:</span>
                <span className="font-bold text-odoo-textPrimary">{detailTarget.asset.name} ({detailTarget.asset.assetTag})</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="font-semibold">Current Holder:</span>
                <span>{detailTarget.currentHolder.name}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="font-semibold">New Proposed Holder:</span>
                <span>{detailTarget.newHolder.name}</span>
              </div>
              <div className="py-2.5 flex flex-col gap-1">
                <span className="font-semibold block">Transfer Reason / Remarks:</span>
                <div className="bg-odoo-bg border border-odoo-border p-2.5 rounded-lg text-odoo-textPrimary">
                  {detailTarget.reason || 'No remarks provided.'}
                </div>
              </div>
              {detailTarget.status === 'REJECTED' && (
                <div className="py-2.5 flex flex-col gap-1">
                  <span className="font-semibold text-rose-600 block">Rejection Reason:</span>
                  <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-rose-800">
                    {detailTarget.rejectedReason || 'No remarks specified.'}
                  </div>
                </div>
              )}
              {detailTarget.status === 'COMPLETED' && (
                <div className="py-2.5 flex justify-between">
                  <span className="font-semibold">Approved By:</span>
                  <span>{detailTarget.approvedBy?.name || 'Authorized system'}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="w-full py-2 bg-odoo-bg hover:bg-gray-100 border border-odoo-border text-odoo-textPrimary text-sm font-bold rounded-lg transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default TransferRequests;
