import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Search, ArrowUpDown, RefreshCw, MoreHorizontal, Link, X, ExternalLink, AlertTriangle, ZoomIn, FileText } from 'lucide-react';
import { Subscription, SubscriptionStatus, UserRole } from '../types';

interface RenewalsViewProps {
  subscriptions: Subscription[];
  updateStatus: (id: string, status: SubscriptionStatus) => void;
  userRole: UserRole;
  onNavigateToNew: (sub?: Subscription) => void;
}

export const RenewalsView: React.FC<RenewalsViewProps> = ({
  subscriptions,
  updateStatus,
  userRole,
  onNavigateToNew
}) => {
  const [view, setView] = React.useState<'pending' | 'history'>('pending');
  const [localSearch, setLocalSearch] = React.useState('');
  const [paymentModal, setPaymentModal] = React.useState<{ open: boolean; subId: string; subName: string; url: string }>({
    open: false, subId: '', subName: '', url: ''
  });
  const [cancelModal, setCancelModal] = React.useState<{ open: boolean; sub?: Subscription }>({
    open: false
  });
  const [renewModal, setRenewModal] = React.useState<{ open: boolean; sub?: Subscription }>({
    open: false
  });
  const [viewPhoto, setViewPhoto] = React.useState<string | null>(null);

  const getOrProposeRenId = (subscription: Subscription) => {
    if (subscription.renewalNo && subscription.renewalNo !== '-') return subscription.renewalNo;
    return '-'; // Return dash for the list view
  };

  const calculateNextRenewalDetails = (subscription: Subscription) => {
    // Propose an ID based on current existing IDs
    const maxRenNo = subscriptions.reduce((max, s) => {
      const match = s.renewalNo && typeof s.renewalNo === 'string' ? s.renewalNo.match(/REN-(\d+)/) : null;
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    
    const nextRenId = `REN-${(maxRenNo + 1).toString().padStart(4, '0')}`;
    const nextRenCount = (subscription.renewalCount || 0) + 1;
    
    return {
      nextRenId,
      nextRenCount
    };
  };

  const isExpiringOrExpired = (endDate?: string) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 5;
  };

  const getDisplayEndDate = (endDate?: string) => {
    if (!endDate) return '-';
    const date = new Date(endDate);
    if (isNaN(date.getTime())) return endDate;
    
    // Subtract 5 days for UI display in Renewal section
    const adjustedDate = new Date(date);
    adjustedDate.setDate(adjustedDate.getDate() - 5);
    
    return adjustedDate.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getDisplayPlannedDate = (startDate?: string, planned1?: string) => {
    const dateStr = startDate || planned1;
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const filteredSubs = React.useMemo(() => {
    let filtered = subscriptions.filter(s => {
      if (view === 'pending') {
        // Show ALL ACTIVE status subscriptions in renewals/pending
        return s.status === SubscriptionStatus.ACTIVE;
      } else {
        // History: EXPIRED or CANCELLED subscriptions
        return s.status === SubscriptionStatus.EXPIRED || s.status === SubscriptionStatus.CANCELLED;
      }
    });

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

  const openPaymentModal = (sub: Subscription) => {
    setPaymentModal({ open: true, subId: sub.id, subName: sub.subscriptionName, url: '' });
  };

  const closePaymentModal = () => {
    setPaymentModal({ open: false, subId: '', subName: '', url: '' });
  };

  return (
    <motion.div
      key="renewals-view"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Photo View Modal */}
      <AnimatePresence>
        {viewPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 md:p-10"
            onClick={() => setViewPhoto(null)}
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all"
              onClick={() => setViewPhoto(null)}
            >
              <X className="w-6 h-6" />
            </motion.button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full h-[90vh] flex items-center justify-center p-4 md:p-8"
              onClick={e => e.stopPropagation()}
            >
              {viewPhoto.startsWith('data:application/pdf') ? (
                <iframe 
                  src={viewPhoto} 
                  title="PDF Bill" 
                  className="w-full h-full rounded-xl shadow-2xl bg-white"
                />
              ) : (
                <img 
                  src={viewPhoto} 
                  alt="Bill Full View" 
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl shadow-black/50" 
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Renew Subscription Modal */}
      <AnimatePresence>
        {renewModal.open && renewModal.sub && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setRenewModal({ open: false })}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative border border-indigo-50"
            >
              <button 
                onClick={() => setRenewModal({ open: false })} 
                className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 transition-colors"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-8 pb-4">
                <h3 className="text-xl font-bold text-zinc-800 mb-1">Renew Subscription</h3>
                <div className="flex flex-col gap-1 mt-2">
                  <p className="text-xs font-semibold text-zinc-500">Original Sub No: <span className="text-zinc-800 font-bold">{renewModal.sub.subscriptionNo}</span></p>
                  <p className="text-xs font-semibold text-indigo-600">New Renewal ID: <span className="font-bold">{renewModal.sub.renewalNo}</span></p>
                  <p className="text-xs font-semibold text-indigo-600">Renewal Number: <span className="font-bold">{renewModal.sub.renewalCount}</span></p>
                </div>
              </div>
              
              <div className="p-8 pt-4 space-y-6">
                <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Company Name</label>
                    <p className="text-sm font-bold text-zinc-700">{renewModal.sub.companyName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Name of the Person</label>
                    <p className="text-sm font-bold text-zinc-700">{renewModal.sub.subscriberName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Category of Subscription</label>
                    <p className="text-sm font-bold text-zinc-700">{renewModal.sub.category || '-'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Name of Subscription</label>
                    <p className="text-sm font-bold text-indigo-600">{renewModal.sub.subscriptionName || '-'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Vendor Name</label>
                    <p className="text-sm font-bold text-zinc-700">{renewModal.sub.subscriptionType || '-'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Price</label>
                    <p className="text-sm font-black text-emerald-600">₹{renewModal.sub.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Frequency</label>
                    <p className="text-sm font-bold text-zinc-700">{renewModal.sub.frequency}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">End Date</label>
                    <p className="text-sm font-bold text-rose-500">
                      {getDisplayEndDate(renewModal.sub.endDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Renewal ID</label>
                    <p className="text-sm font-bold text-zinc-700 italic font-mono">{renewModal.sub.renewalNo || '-'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Renewal Number</label>
                    <p className="text-sm font-bold text-zinc-700 italic font-mono">{renewModal.sub.renewalCount || '-'}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-indigo-50">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Renew Subscription</label>
                  <div className="flex bg-zinc-50 p-2 rounded-2xl">
                    <button 
                      onClick={() => {
                        window.open('https://docs.google.com/forms/d/e/1FAIpQLSeEVCLUwAoMXXSmC0rWUDnKSZuQs3LmF-Ki_6fgOZ2wFifYcg/viewform?usp=sf_link', '_blank', 'noopener,noreferrer');
                      }}
                      className="w-full py-4 px-6 bg-white border-2 border-indigo-100/50 rounded-xl text-indigo-600 font-extrabold flex items-center justify-between hover:border-indigo-200 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <ExternalLink className="w-5 h-5 text-indigo-400" />
                        <span>Renewal Form</span>
                      </div>
                      <Link className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    onNavigateToNew(renewModal.sub);
                    setRenewModal({ open: false });
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4.5 rounded-[1.25rem] font-black tracking-wide transition-all active:scale-95 shadow-2xl shadow-indigo-100 mt-4"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {cancelModal.open && cancelModal.sub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm px-4"
            onClick={() => setCancelModal({ open: false })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative overflow-hidden"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
              
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-rose-50 rounded-full">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
              </div>

              <h3 className="text-xl font-black text-zinc-900 mb-3">Cancel Subscription?</h3>
              <p className="text-zinc-500 text-sm leading-relaxed mb-8">
                Are you sure you want to cancel <span className="font-bold text-zinc-900">"{cancelModal.sub.subscriptionName}"</span>? 
                This will move it to History.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    if (cancelModal.sub) {
                      updateStatus(cancelModal.sub.id, SubscriptionStatus.CANCELLED);
                      setCancelModal({ open: false });
                    }
                  }}
                  className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-rose-200"
                >
                  Yes, Cancel it
                </button>
                <button
                  onClick={() => setCancelModal({ open: false })}
                  className="w-full py-4 text-zinc-400 font-bold hover:text-zinc-600 transition-colors"
                >
                  No, Keep it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Link Modal */}
      <AnimatePresence>
        {paymentModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={closePaymentModal}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Link className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-indigo-900 text-base">Payment Link</h3>
                    <p className="text-xs text-zinc-400">{paymentModal.subName}</p>
                  </div>
                </div>
                <button onClick={closePaymentModal} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase">Payment URL</label>
                <input
                  type="url"
                  placeholder="https://pay.example.com/..."
                  value={paymentModal.url}
                  onChange={e => setPaymentModal(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full bg-zinc-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  autoFocus
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={closePaymentModal}
                    className="flex-1 py-2.5 text-sm font-bold text-zinc-500 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!paymentModal.url.trim()}
                    onClick={() => {
                      if (paymentModal.url.trim()) {
                        window.open(paymentModal.url.trim(), '_blank', 'noopener,noreferrer');
                        closePaymentModal();
                      }
                    }}
                    className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Link
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standardized Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
            <RotateCcw className="text-indigo-600 w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-indigo-900 tracking-tight">Renewals</h2>
            <p className="text-zinc-500 text-xs md:text-sm font-medium">Renew subscriptions that have passed end date</p>
          </div>
        </div>
        <button className="hidden sm:flex w-11 h-11 bg-white rounded-xl items-center justify-center border border-indigo-50 shadow-sm text-zinc-400 hover:text-indigo-600 transition-colors">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl border border-indigo-100 p-1 shadow-sm overflow-x-auto">
        <button
          onClick={() => setView('pending')}
          className={`flex-1 py-2.5 px-4 text-xs md:text-sm font-bold rounded-lg transition-all min-w-[100px] ${view === 'pending' ? 'bg-white text-indigo-600 border-2 border-indigo-600 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
        >
          Pending
        </button>
        <button
          onClick={() => setView('history')}
          className={`flex-1 py-2.5 px-4 text-xs md:text-sm font-bold rounded-lg transition-all min-w-[100px] ${view === 'history' ? 'bg-white text-indigo-600 border-2 border-indigo-600 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
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

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-indigo-50">
                {view === 'pending' ? (
                  <>
                    <th className="table-header text-center whitespace-nowrap px-4 py-3 min-w-[140px]">
                      <div className="flex justify-center">Action</div>
                    </th>
                    <th className="table-header whitespace-nowrap">Timestamp</th>
                    <th className="table-header whitespace-nowrap text-center">Status</th>
                    <th className="table-header text-center whitespace-nowrap">Subscription No</th>
                    <th className="table-header text-center whitespace-nowrap">Renewal ID</th>
                    <th className="table-header text-center whitespace-nowrap">Renewal No</th>
                    <th className="table-header whitespace-nowrap">Company</th>
                    <th className="table-header whitespace-nowrap">Name of the Person</th>
                    <th className="table-header whitespace-nowrap">Category of Subscription</th>
                    <th className="table-header whitespace-nowrap">Name of Subscription</th>
                    <th className="table-header whitespace-nowrap">Vendor Name</th>
                    <th className="table-header text-center whitespace-nowrap">Frequency</th>
                    <th className="table-header text-center whitespace-nowrap">Planned Date</th>
                    <th className="table-header text-center whitespace-nowrap">End Date</th>
                    <th className="table-header text-center whitespace-nowrap">Price</th>
                    <th className="table-header text-center whitespace-nowrap">Bill Image</th>
                  </>
                ) : (
                  <>
                    <th className="table-header whitespace-nowrap py-4 px-4 flex items-center gap-1">End Date <ArrowUpDown className="w-3 h-3"/></th>
                    <th className="table-header whitespace-nowrap py-4 px-4">Renewal ID</th>
                    <th className="table-header whitespace-nowrap py-4 px-4 text-center">Renewal No</th>
                    <th className="table-header whitespace-nowrap py-4 px-4">Subscription No</th>
                    <th className="table-header whitespace-nowrap py-4 px-4">Company</th>
                    <th className="table-header whitespace-nowrap py-4 px-4">Subscriber</th>
                    <th className="table-header whitespace-nowrap py-4 px-4">Subscription</th>
                    <th className="table-header whitespace-nowrap py-4 px-4 text-center">Frequency</th>
                    <th className="table-header whitespace-nowrap py-4 px-4 text-center">Status</th>
                    <th className="table-header whitespace-nowrap py-4 px-4 text-center flex items-center justify-center gap-1">Price <ArrowUpDown className="w-3 h-3"/></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/50">
              {filteredSubs.length > 0 && filteredSubs.map((sub) => (
                <tr key={sub.id} className="hover:bg-indigo-50/20 transition-colors group">
                  {view === 'pending' ? (
                    <>
                      <td className="table-cell py-4 px-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            disabled={!isExpiringOrExpired(sub.endDate)}
                            onClick={() => {
                              const { nextRenId, nextRenCount } = calculateNextRenewalDetails(sub);
                              setRenewModal({ 
                                open: true, 
                                sub: { 
                                  ...sub, 
                                  renewalNo: nextRenId, 
                                  renewalCount: nextRenCount 
                                } 
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap uppercase tracking-wider ${isExpiringOrExpired(sub.endDate) ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100' : 'bg-zinc-50 text-zinc-400 border border-zinc-100 cursor-not-allowed grayscale opacity-50'}`}
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Renew
                          </button>
                          <button
                            onClick={() => setCancelModal({ open: true, sub })}
                            className="bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap uppercase tracking-wider hover:bg-rose-100"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </div>
                      </td>
                      <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-[10px] font-medium text-center">
                        {(() => {
                          const date = new Date(sub.createdAt);
                          return isNaN(date.getTime()) 
                            ? sub.createdAt 
                            : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
                        })()}
                      </td>
                      <td className="table-cell py-4 px-4 align-middle text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${isExpiringOrExpired(sub.endDate) ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-zinc-200 bg-zinc-50 text-zinc-500'} whitespace-nowrap`}>
                          {isExpiringOrExpired(sub.endDate) ? 'Needs Renewal' : 'Not Due Yet'}
                        </span>
                      </td>
                      <td className="table-cell py-4 px-4 align-middle font-mono text-xs text-zinc-500 text-center">{sub.subscriptionNo}</td>
                      <td className="table-cell py-4 px-4 align-middle font-mono text-xs text-zinc-500 text-center">{getOrProposeRenId(sub)}</td>
                      <td className="table-cell py-4 px-4 align-middle font-mono text-xs text-zinc-400 font-medium text-center">{sub.renewalCount || '-'}</td>
                      <td className="table-cell py-4 px-4 align-middle text-zinc-600">{sub.companyName}</td>
                      <td className="table-cell py-4 px-4 align-middle text-zinc-600">{sub.subscriberName}</td>
                      <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-xs">{sub.category}</td>
                      <td className="table-cell py-4 px-4 align-middle text-indigo-500 font-bold">{sub.subscriptionName}</td>
                      <td className="table-cell py-4 px-4 align-middle text-indigo-900 text-xs font-bold">{sub.subscriptionType || '-'}</td>
                      <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-center text-xs">{sub.frequency}</td>
                      <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-[10px] font-medium text-center">
                        {getDisplayPlannedDate(sub.startDate, sub.planned1)}
                      </td>
                      <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-[10px] font-medium text-center">
                        {getDisplayEndDate(sub.endDate)}
                      </td>
                      <td className="table-cell py-4 px-4 align-middle font-black text-emerald-600 text-center whitespace-nowrap">₹{sub.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="table-cell py-4 px-4 align-middle text-center">
                        {sub.photoUrl ? (
                          <div 
                            onClick={() => setViewPhoto(sub.photoUrl!)}
                            className="w-10 h-10 mx-auto rounded-lg border-2 border-indigo-100 overflow-hidden relative cursor-zoom-in hover:border-indigo-500 transition-all shadow-sm group/bill flex items-center justify-center bg-white"
                          >
                            {sub.photoUrl.startsWith('data:application/pdf') ? (
                              <FileText className="w-5 h-5 text-rose-500" />
                            ) : (
                              <img src={sub.photoUrl} alt="Bill" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ) : '-'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="table-cell py-4 px-4 align-middle text-zinc-600 font-medium whitespace-nowrap">
                        {getDisplayEndDate(sub.endDate)}
                      </td>
                      <td className="table-cell py-4 px-4 align-middle font-black text-indigo-600 font-mono text-xs italic">{sub.renewalNo || '-'}</td>
                      <td className="table-cell py-4 px-4 align-middle font-black text-indigo-600 font-mono text-xs italic text-center">{sub.renewalCount || '-'}</td>
                      <td className="table-cell py-4 px-4 align-middle font-mono text-zinc-400 font-bold text-xs">{sub.subscriptionNo}</td>
                      <td className="table-cell py-4 px-4 align-middle text-zinc-600 font-bold">{sub.companyName}</td>
                      <td className="table-cell py-4 px-4 align-middle text-zinc-600">{sub.subscriberName}</td>
                      <td className="table-cell py-4 px-4 align-middle text-indigo-500 font-bold">{sub.subscriptionName}</td>
                      <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-center text-xs">{sub.frequency}</td>
                      <td className="table-cell py-4 px-4 align-middle text-center">
                        <span className={`px-4 py-1 rounded-full text-[10px] font-bold border ${sub.status === SubscriptionStatus.CANCELLED ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-emerald-200 bg-emerald-50 text-emerald-600'}`}>
                          {sub.status === SubscriptionStatus.CANCELLED ? 'Cancelled' : 'Renewed'}
                        </span>
                      </td>
                      <td className="table-cell py-4 px-4 align-middle font-black text-emerald-600 text-center whitespace-nowrap">₹{sub.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-indigo-50">
          {filteredSubs.length > 0 ? filteredSubs.map((sub) => (
            <div key={sub.id} className="p-4 space-y-3 bg-white hover:bg-indigo-50/20 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-600 font-mono italic">{sub.subscriptionNo}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${isExpiringOrExpired(sub.endDate) ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-zinc-200 bg-zinc-50 text-zinc-500'}`}>
                  {isExpiringOrExpired(sub.endDate) ? 'Needs Renewal' : 'Not Due Yet'}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-black text-indigo-900 leading-tight">{sub.subscriptionName}</h4>
                <p className="text-[11px] text-zinc-500 font-medium">{sub.companyName}</p>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-0.5">End Date</p>
                  <p className="text-xs font-bold text-rose-500">
                    {getDisplayEndDate(sub.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-0.5">Price</p>
                  <p className="text-xs font-black text-emerald-600">₹{sub.price.toLocaleString()}</p>
                </div>
              </div>

              {view === 'pending' && (
                <div className="flex items-center gap-2 pt-2 border-t border-indigo-50/50">
                  <button
                    disabled={!isExpiringOrExpired(sub.endDate)}
                    onClick={() => setRenewModal({ open: true, sub })}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${isExpiringOrExpired(sub.endDate) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Renew
                  </button>
                  <button
                    onClick={() => setCancelModal({ open: true, sub })}
                    className="px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black transition-all flex items-center justify-center uppercase tracking-widest"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )) : (
            <div className="py-12 text-center text-zinc-300 font-medium italic text-sm">
              No {view} renewals found
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
