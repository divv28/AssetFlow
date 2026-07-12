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
  Check, X, Eye, FileText, Calendar, Image as ImageIcon, AlertTriangle 
} from 'lucide-react';

export const ReturnRequests = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page')) || 1;

  // Review states
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';

  // Fetch Return Requests
  const { data: returnsData, isLoading } = useQuery({
    queryKey: ['return-requests', page],
    queryFn: async () => {
      const res = await api.get('/api/allocations/returns', { params: { page, limit: 10 } });
      return res.data;
    },
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.patch(`/api/allocations/returns/${id}/approve`);
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Return request approved. Asset status synchronized and allocation closed.');
      queryClient.invalidateQueries({ queryKey: ['return-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsReviewOpen(false);
      setReviewTarget(null);
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to approve return request');
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const res = await api.patch(`/api/allocations/returns/${id}/reject`, { rejectedReason: reason });
      return res.data.data;
    },
    onSuccess: () => {
      addToast('success', 'Return request rejected successfully.');
      queryClient.invalidateQueries({ queryKey: ['return-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsReviewOpen(false);
      setReviewTarget(null);
      setRejectReason('');
      setShowRejectForm(false);
    },
    onError: (err) => {
      addToast('error', err.response?.data?.message || 'Failed to reject return request');
    },
  });

  const handleApprove = (id) => {
    approveMutation.mutate(id);
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      addToast('error', 'Please provide a rejection reason');
      return;
    }
    rejectMutation.mutate({ id: reviewTarget.id, reason: rejectReason.trim() });
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
      header: 'Requested By',
      accessor: (row) => (
        <div>
          <span className="font-semibold block text-odoo-textPrimary">{row.requestedBy.name}</span>
          <span className="text-[10px] text-gray-400 block">{row.requestedBy.email}</span>
        </div>
      ),
    },
    {
      header: 'Condition Recorded',
      accessor: (row) => {
        let textClass = 'text-emerald-700 font-bold';
        if (row.condition === 'DAMAGED' || row.condition === 'NEEDS_REPAIR') {
          textClass = 'text-red-600 font-bold flex items-center gap-1';
        }
        return (
          <span className={textClass}>
            {(row.condition === 'DAMAGED' || row.condition === 'NEEDS_REPAIR') && (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            {row.condition}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: (row) => {
        let type = 'neutral';
        if (row.status === 'APPROVED') type = 'success';
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
        const isPending = row.status === 'REQUESTED';
        return (
          <button
            onClick={() => {
              setReviewTarget(row);
              setIsReviewOpen(true);
              setShowRejectForm(false);
              setRejectReason('');
            }}
            className="p-1.5 bg-gray-50 border border-odoo-border hover:bg-gray-100 rounded-lg text-odoo-textSecondary flex items-center gap-1 text-[11px]"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isPending && isAdminOrManager ? 'Review & Resolve' : 'Details'}</span>
          </button>
        );
      },
    },
  ];

  return (
    <DashboardLayout
      title="Asset Return Inspection Requests"
      breadcrumbs={[{ label: 'Home', path: '/dashboard' }, { label: 'Allocations & Transfers', path: '/allocations' }, { label: 'Return Requests' }]}
    >
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Tabs Header */}
        <div className="border-b border-odoo-border flex gap-4 overflow-x-auto shrink-0 bg-white p-2 rounded-lg border">
          <Link to="/allocations" className="px-4 py-2 rounded-lg text-xs font-bold text-odoo-textSecondary hover:bg-gray-50 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Allocation Dashboard</span>
          </Link>
          <Link to="/allocations/transfers" className="px-4 py-2 rounded-lg text-xs font-bold text-odoo-textSecondary hover:bg-gray-50 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transfer Requests</span>
          </Link>
          <Link to="/allocations/returns" className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-white shadow-sm flex items-center gap-2">
            <CornerDownLeft className="w-4 h-4" />
            <span>Return Requests</span>
          </Link>
          <Link to="/allocations/history" className="px-4 py-2 rounded-lg text-xs font-bold text-odoo-textSecondary hover:bg-gray-50 flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>Allocation History</span>
          </Link>
        </div>

        {/* Listings Table */}
        <div className="bg-white border border-odoo-border rounded-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton rows={5} />
            </div>
          ) : (
            <DataTable
              columns={tableColumns}
              data={returnsData?.data || []}
              pagination={returnsData?.meta}
              onPageChange={(p) => setSearchParams({ page: String(p) })}
            />
          )}
        </div>

      </div>

      {/* Review Modal Dialog */}
      {isReviewOpen && reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsReviewOpen(false)}></div>
          <div className="relative bg-white border border-odoo-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-odoo-textPrimary">
              Return Request Review
            </h3>

            <div className="divide-y divide-odoo-border text-odoo-textSecondary">
              <div className="py-2.5 flex justify-between">
                <span className="font-semibold">Asset:</span>
                <span className="font-bold text-odoo-textPrimary">{reviewTarget.asset.name} ({reviewTarget.asset.assetTag})</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="font-semibold">Requested By:</span>
                <span>{reviewTarget.requestedBy.name}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="font-semibold">Condition Reported:</span>
                <span className={`font-bold ${reviewTarget.condition === 'GOOD' || reviewTarget.condition === 'EXCELLENT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {reviewTarget.condition}
                </span>
              </div>
              <div className="py-2.5 flex flex-col gap-1">
                <span className="font-semibold block">Employee Return Notes:</span>
                <div className="bg-odoo-bg border border-odoo-border p-2.5 rounded-lg text-odoo-textPrimary">
                  {reviewTarget.notes || 'No notes provided.'}
                </div>
              </div>

              {reviewTarget.photoUrl && (
                <div className="py-2.5 space-y-1.5">
                  <span className="font-semibold block">Inspection Attachment Photo:</span>
                  <a
                    href={reviewTarget.photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>View Full Image Attachment</span>
                  </a>
                  <div className="border border-odoo-border rounded-lg overflow-hidden max-h-48 flex justify-center bg-gray-50">
                    <img
                      src={reviewTarget.photoUrl}
                      alt="Inspection attachment"
                      className="object-contain max-h-full"
                    />
                  </div>
                </div>
              )}

              {reviewTarget.status === 'REJECTED' && (
                <div className="py-2.5 flex flex-col gap-1">
                  <span className="font-semibold text-rose-600 block">Rejection Reason:</span>
                  <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-rose-800">
                    {reviewTarget.rejectedReason || 'No remarks specified.'}
                  </div>
                </div>
              )}
            </div>

            {/* Review actions form */}
            {reviewTarget.status === 'REQUESTED' && isAdminOrManager && (
              <div className="pt-2 border-t border-odoo-border space-y-3">
                {!showRejectForm ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(reviewTarget.id)}
                      disabled={approveMutation.isPending}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Return</span>
                    </button>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject Return</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRejectSubmit} className="space-y-3">
                    <div>
                      <label className="block font-bold text-odoo-textSecondary mb-1.5 uppercase">Rejection Reason *</label>
                      <textarea
                        rows="2"
                        placeholder="Specify rejection details or info needed..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-odoo-border rounded-lg text-sm focus-ring"
                        required
                      ></textarea>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(false)}
                        className="flex-1 py-2 border border-odoo-border text-odoo-textPrimary font-bold rounded-lg text-xs"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={!rejectReason.trim() || rejectMutation.isPending}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs disabled:opacity-50"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="w-full py-2 bg-odoo-bg hover:bg-gray-100 border border-odoo-border text-odoo-textPrimary text-sm font-bold rounded-lg transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default ReturnRequests;
