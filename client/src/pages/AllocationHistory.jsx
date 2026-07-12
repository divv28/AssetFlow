import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

import DashboardLayout from '../layouts/DashboardLayout';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

import { 
  ShieldCheck, ArrowLeftRight, CornerDownLeft, History, 
  User, Database, Calendar, Tag, ShieldAlert, Award, FileClock 
} from 'lucide-react';

export const AllocationHistory = () => {
  const { user } = useAuth();

  // Fetch chronological allocation timeline events
  const { data: historyEvents, isLoading } = useQuery({
    queryKey: ['allocation-history-events'],
    queryFn: async () => {
      const res = await api.get('/api/allocations/history');
      return res.data.data;
    },
  });

  const getEventStyles = (type) => {
    switch (type) {
      case 'ALLOCATED':
        return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700 font-bold', label: 'Allocated' };
      case 'TRANSFER_REQUESTED':
        return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700 font-semibold', label: 'Transfer Requested' };
      case 'TRANSFER_APPROVED':
        return { bg: 'bg-teal-50 border-teal-200', text: 'text-teal-700 font-bold', label: 'Transfer Approved' };
      case 'TRANSFER_REJECTED':
        return { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700 font-semibold', label: 'Transfer Rejected' };
      case 'RETURN_REQUESTED':
        return { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700 font-semibold', label: 'Return Requested' };
      case 'RETURN_APPROVED':
        return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700 font-bold', label: 'Return Approved' };
      case 'RETURN_REJECTED':
        return { bg: 'bg-red-50 border-red-200', text: 'text-red-700 font-semibold', label: 'Return Rejected' };
      case 'OVERDUE_FLAGGED':
        return { bg: 'bg-rose-100 border-rose-300', text: 'text-rose-800 font-black', label: 'Overdue Flagged' };
      default:
        return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600', label: 'Activity Event' };
    }
  };

  return (
    <DashboardLayout
      title="Asset Allocation History & Events Log"
      breadcrumbs={[{ label: 'Home', path: '/dashboard' }, { label: 'Allocations & Transfers', path: '/allocations' }, { label: 'Allocation History' }]}
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
          <Link to="/allocations/returns" className="px-4 py-2 rounded-lg text-xs font-bold text-odoo-textSecondary hover:bg-gray-50 flex items-center gap-2">
            <CornerDownLeft className="w-4 h-4" />
            <span>Return Requests</span>
          </Link>
          <Link to="/allocations/history" className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-white shadow-sm flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>Allocation History</span>
          </Link>
        </div>

        {/* History Timeline */}
        <div className="bg-white border border-odoo-border rounded-card p-6 md:p-8 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-odoo-textPrimary flex items-center gap-2">
            <FileClock className="w-5 h-5 text-primary" />
            <span>Unified Allocation Timeline</span>
          </h3>

          {isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : !historyEvents || historyEvents.length === 0 ? (
            <div className="text-center py-12 text-odoo-textSecondary">
              <History className="w-12 h-12 mx-auto mb-3 text-gray-300 stroke-1" />
              <p className="text-sm font-semibold">No timeline events recorded yet.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-odoo-border ml-3 md:ml-4 pl-6 space-y-6">
              {historyEvents.map((evt) => {
                const styles = getEventStyles(evt.eventType);
                return (
                  <div key={evt.id} className="relative group text-xs text-odoo-textSecondary">
                    {/* Timeline bullet dot */}
                    <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-white border-2 border-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    </div>

                    {/* Timeline event box card */}
                    <div className="border border-odoo-border rounded-xl p-4 space-y-2 shadow-sm bg-white hover:border-primary/30 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 border text-[10px] rounded-md ${styles.bg} ${styles.text}`}>
                            {styles.label}
                          </span>
                          <span className="font-bold text-odoo-textPrimary">
                            {evt.asset.name} ({evt.asset.assetTag})
                          </span>
                        </div>
                        <span className="font-semibold text-[10px] text-gray-400">
                          {new Date(evt.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Event Details Description */}
                      <div className="space-y-1.5 pl-1.5 border-l-2 border-primary/20">
                        <div>
                          <span className="font-semibold">Action Performed By:</span>{' '}
                          <span className="text-odoo-textPrimary font-bold">{evt.actor.name}</span>{' '}
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1 py-0.2 rounded font-mono uppercase">{evt.actor.role}</span>
                        </div>
                        {evt.allocation?.employee && (
                          <div>
                            <span className="font-semibold">Target Allocation Holder:</span>{' '}
                            <span className="text-odoo-textPrimary font-bold">{evt.allocation.employee.name}</span>
                          </div>
                        )}
                        {evt.metadata && (
                          <div className="bg-odoo-bg border border-odoo-border p-2 rounded-lg mt-1 space-y-0.5 text-[11px]">
                            {evt.metadata.fromHolder && (
                              <div>
                                <span className="font-semibold">From Holder:</span>{' '}
                                <span className="text-odoo-textPrimary">{evt.metadata.fromHolder}</span>
                              </div>
                            )}
                            {evt.metadata.toHolder && (
                              <div>
                                <span className="font-semibold">To Proposed Holder:</span>{' '}
                                <span className="text-primary font-bold">{evt.metadata.toHolder}</span>
                              </div>
                            )}
                            {evt.metadata.condition && (
                              <div>
                                <span className="font-semibold">Inspection Condition:</span>{' '}
                                <span className="text-odoo-textPrimary font-bold">{evt.metadata.condition}</span>
                              </div>
                            )}
                            {evt.metadata.rejectedReason && (
                              <div>
                                <span className="font-semibold text-rose-600">Rejection Reason:</span>{' '}
                                <span className="text-rose-800">{evt.metadata.rejectedReason}</span>
                              </div>
                            )}
                            {evt.metadata.notes && (
                              <div>
                                <span className="font-semibold">Remarks/Notes:</span>{' '}
                                <span className="text-odoo-textPrimary italic">"{evt.metadata.notes}"</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AllocationHistory;
