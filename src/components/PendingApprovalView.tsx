import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, MonitorCheck, Search, ArrowUpDown, MoreHorizontal, Eye, X, ChevronDown, Check, X as CloseIcon } from 'lucide-react';
import { Subscription, SubscriptionStatus } from '../types';

interface PendingApprovalViewProps {
  subscriptions: Subscription[];
  updateStatus: (id: string, status: SubscriptionStatus, extraData?: any) => void;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  subscriptions,
  updateStatus
}) => {
  const [view, setView] = React.useState<'pending' | 'history'>('pending');
  const [localSearch, setLocalSearch] = React.useState('');
  const [selectedSub, setSelectedSub] = React.useState<Subscription | null>(null);
  const [reviewAction, setReviewAction] = useState<string>('');
  const [reviewNote, setReviewNote] = useState<string>('');

  const filteredSubs = React.useMemo(() => {
    let filtered = subscriptions.filter(s => 
      view === 'pending' 
        ? s.status === SubscriptionStatus.PENDING_APPROVAL 
        : (s.status !== SubscriptionStatus.PENDING_APPROVAL)
    );

    if (localSearch) {
      const q = localSearch.toLowerCase();
      filtered = filtered.filter(s => 
        s.subscriptionName.toLowerCase().includes(q) || 
        s.subscriberName.toLowerCase().includes(q) || 
        s.companyName.toLowerCase().includes(q) ||
        s.subscriptionNo.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [subscriptions, view, localSearch]);

  const handleSubmitReview = () => {
    if (!selectedSub || !reviewAction) return;
    
    const status = reviewAction === 'approve' 
      ? SubscriptionStatus.PENDING_PAYMENT 
      : SubscriptionStatus.REJECTED;
      
    // Update status and append note to details if any
    const finalDetails = reviewNote 
      ? `${selectedSub.details}\n--- Review Note ---\n${reviewNote}`.trim()
      : selectedSub.details;

    updateStatus(selectedSub.id, status, { details: finalDetails });
    setSelectedSub(null);
    setReviewAction('');
    setReviewNote('');
  };

  return (
    <motion.div 
      key="pending-approval"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Standardized Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
            <MonitorCheck className="text-indigo-600 w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">Pending Approval</h2>
            <p className="text-zinc-500 text-sm font-medium">Subscriptions requests pending for approval</p>
          </div>
        </div>
        <button className="w-11 h-11 bg-white rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm text-zinc-400 hover:text-indigo-600 transition-colors">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl border border-indigo-100 p-1 shadow-sm">
        <button 
          onClick={() => setView('pending')}
          className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${view === 'pending' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          Pending
        </button>
        <button 
          onClick={() => setView('history')}
          className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${view === 'history' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          History
        </button>
      </div>

      <div className="card overflow-hidden border-indigo-50 shadow-xl shadow-indigo-50/20">
        {/* Search */}
        <div className="p-4 bg-white border-b border-indigo-50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-12 pr-4 py-3 bg-zinc-50/50 border border-indigo-50 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-300"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-indigo-50">
                {view === 'pending' && <th className="table-header py-4 px-4 text-center whitespace-nowrap">Action</th>}
                <th className="table-header py-4 px-4 text-center whitespace-nowrap">Timestamp</th>
                <th className="table-header py-4 px-4 text-center whitespace-nowrap">Subscription No</th>
                {view === 'history' && (
                  <th className="table-header py-4 px-4 text-center whitespace-nowrap">
                    Approval No
                  </th>
                )}
                <th className="table-header py-4 px-4 whitespace-nowrap">Company</th>
                <th className="table-header py-4 px-4 whitespace-nowrap">Name of the Person</th>
                <th className="table-header py-4 px-4 whitespace-nowrap">Category of subscription</th>
                <th className="table-header py-4 px-4 whitespace-nowrap">Name of Subscription</th>
                <th className="table-header py-4 px-4 whitespace-nowrap">Vendor Name</th>
                <th className="table-header py-4 px-4 text-center whitespace-nowrap">Price</th>
                <th className="table-header py-4 px-4 text-center whitespace-nowrap">Planned Date</th>
                <th className="table-header py-4 px-4 text-center whitespace-nowrap">Frequency</th>
                {view === 'history' && <th className="table-header py-4 px-4 whitespace-nowrap">Status</th>}
                {view === 'history' && (
                  <th className="table-header py-4 px-4 text-center whitespace-nowrap">
                    Reviewed On
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/50">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-24 text-center text-zinc-300 font-medium italic">
                    No {view} requests found
                  </td>
                </tr>
              ) : (
                filteredSubs.map(sub => (
                  <tr key={sub.id} className="hover:bg-indigo-50/20 transition-colors group">
                    {view === 'pending' && (
                      <td className="table-cell py-4 px-4 align-middle text-center">
                        <button 
                          onClick={() => {
                            setSelectedSub(sub);
                            setReviewAction('');
                            setReviewNote('');
                          }}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                        >
                          Review
                        </button>
                      </td>
                    )}
                    <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-[10px] font-medium text-center">
                      {(() => {
                        const date = new Date(sub.createdAt);
                        return isNaN(date.getTime()) 
                          ? sub.createdAt 
                          : date.toLocaleString('en-GB', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            });
                      })()}
                    </td>
                    <td className="table-cell py-4 px-4 align-middle font-mono text-xs text-zinc-500 text-center">{sub.subscriptionNo}</td>
                    {view === 'history' && (
                      <td className="table-cell py-4 px-4 align-middle text-zinc-500 font-bold text-xs text-center">
                        {sub.approvalNo || '-'}
                      </td>
                    )}
                    <td className="table-cell py-4 px-4 align-middle text-zinc-600">{sub.companyName}</td>
                    <td className="table-cell py-4 px-4 align-middle text-zinc-600">{sub.subscriberName}</td>
                    <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-xs">{sub.category}</td>
                    <td className="table-cell py-4 px-4 align-middle text-zinc-600 text-xs font-medium">{sub.subscriptionType || '-'}</td>
                    <td className="table-cell py-4 px-4 align-middle">
                      <span className="text-indigo-600 font-bold">{sub.subscriptionName}</span>
                    </td>
                    <td className="table-cell py-4 px-4 align-middle font-black text-emerald-600 text-center whitespace-nowrap">₹{sub.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-[10px] font-medium text-center">
                      {/* Planned Date = submission timestamp (= Planned 1 in Google Sheet) */}
                      {sub.createdAt && !isNaN(new Date(sub.createdAt).getTime()) 
                        ? new Date(sub.createdAt).toLocaleString('en-GB', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                          }) 
                        : '-'}
                    </td>
                    <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-center text-xs">{sub.frequency}</td>
                    {view === 'history' && (
                      <td className="table-cell py-4 px-4 align-middle">
                        <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold border ${
                          sub.status === SubscriptionStatus.PAID || sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.PENDING_PAYMENT
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                            : sub.status === SubscriptionStatus.REJECTED 
                            ? 'bg-rose-50 text-rose-600 border-rose-200' 
                            : 'bg-amber-50 text-amber-600 border-amber-200'
                        }`}>
                          {sub.status === SubscriptionStatus.PENDING_PAYMENT ? 'Approved' : sub.status.replace('_', ' ')}
                        </span>
                      </td>
                    )}
                    {view === 'history' && (
                      <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-[10px] text-center">
                        {/* Reviewed On = approval timestamp (= Actual 1 in Google Sheet) */}
                        {sub.approvedOn && !isNaN(new Date(sub.approvedOn).getTime())
                          ? new Date(sub.approvedOn).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })
                          : sub.approvedOn || '-'}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedSub && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSub(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden relative border border-indigo-50"
            >
              <button 
                onClick={() => setSelectedSub(null)} 
                className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 transition-colors"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-8 pb-4">
                <h3 className="text-xl font-bold text-zinc-800 mb-1">Review Subscription Request</h3>
                <p className="text-sm font-medium text-zinc-500">Subscription <span className="text-zinc-800 font-bold">{selectedSub.subscriptionNo}</span></p>
              </div>
              
              <div className="p-8 pt-4 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
                <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Company Name</label>
                    <p className="text-sm font-bold text-zinc-700">{selectedSub.companyName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Name of the Person</label>
                    <p className="text-sm font-bold text-zinc-700">{selectedSub.subscriberName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Category of subscription</label>
                    <p className="text-sm font-bold text-zinc-700">{selectedSub.category}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Vendor Name</label>
                    <p className="text-sm font-bold text-zinc-700">{selectedSub.subscriptionName}</p>
                  </div>
                  <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100/50">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5 block">Price</label>
                    <p className="text-sm font-black text-emerald-600">₹{selectedSub.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Frequency</label>
                    <p className="text-sm font-bold text-zinc-700">{selectedSub.frequency}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Requested On</label>
                    <p className="text-sm font-bold text-zinc-700">
                      {new Date(selectedSub.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remark of Purpose</label>
                  <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-xl">
                    <p className="text-sm text-zinc-600 leading-relaxed font-medium">{selectedSub.details || 'No details provided'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Review Subscription</label>
                  <div className="flex bg-zinc-50 p-1.5 rounded-2xl gap-3">
                    <button 
                      onClick={() => setReviewAction('approve')}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 border-2 ${
                        reviewAction === 'approve' 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100 scale-[1.02]' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" /> Approve Request
                    </button>
                    <button 
                      onClick={() => setReviewAction('reject')}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 border-2 ${
                        reviewAction === 'reject' 
                          ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-100 scale-[1.02]' 
                          : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                      }`}
                    >
                      <XCircle className="w-5 h-5" /> Reject Request
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Note (Optional)</label>
                  <textarea 
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={3}
                    placeholder="Enter a note"
                    className="w-full bg-white border-2 border-indigo-100/50 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-zinc-300 font-medium"
                  />
                </div>

                <button 
                  disabled={!reviewAction}
                  onClick={handleSubmitReview}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:grayscale text-white py-4.5 rounded-[1.25rem] font-black tracking-wide transition-all active:scale-95 shadow-2xl shadow-indigo-100 mt-4 flex items-center justify-center gap-2"
                >
                  Submit Review
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
