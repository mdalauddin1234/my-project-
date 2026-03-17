import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, MoreHorizontal, Search, ArrowUpDown, Link, X, ExternalLink, Image as ImageIcon, Upload, CheckSquare, Square, CheckCircle2, ChevronDown } from 'lucide-react';
import { Subscription, SubscriptionStatus } from '../types';

interface PaymentsViewProps {
  subscriptions: Subscription[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  updateStatus: (id: string, status: SubscriptionStatus, extraData?: any) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  subscriptions,
  searchQuery,
  setSearchQuery,
  updateStatus
}) => {
  const [view, setView] = React.useState<'pending' | 'history'>('pending');
  const [paymentModal, setPaymentModal] = React.useState<{ open: boolean; subId: string; subName: string; url: string }>({
    open: false, subId: '', subName: '', url: ''
  });


  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [transactionId, setTransactionId] = useState('');

  const DEFAULT_PAYMENT_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScn8tHEUldlOM_8DKpHUfHHiRImDVjkpkhhfduaZUIxpxlJrA/viewform';

  const openPaymentModal = (sub: Subscription) => {
    setPaymentModal({ open: true, subId: sub.id, subName: sub.subscriptionName, url: DEFAULT_PAYMENT_URL });
  };

  const closePaymentModal = () => {
    setPaymentModal({ open: false, subId: '', subName: '', url: '' });
  };

  const handleOpenLink = () => {
    if (paymentModal.url.trim()) {
      window.open(paymentModal.url.trim(), '_blank', 'noopener,noreferrer');
      closePaymentModal();
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchSubmit = () => {
    selectedIds.forEach(id => {
      updateStatus(id, SubscriptionStatus.PAID, {
        paymentMode,
        transactionId,
        insuranceDoc: 'N/A'
      });
    });
    setSelectedIds(new Set());
    setTransactionId('');
  };


  const filteredSubs = React.useMemo(() => {
    let filtered = subscriptions.filter(s => {
      if (view === 'pending') return s.status === SubscriptionStatus.PENDING_PAYMENT;
      return s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.PAID || s.status === SubscriptionStatus.EXPIRED;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.subscriptionName.toLowerCase().includes(q) ||
        s.subscriberName.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        s.subscriptionNo.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [subscriptions, view, searchQuery]);

  return (
    <motion.div
      key="payments"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
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
                    onClick={handleOpenLink}
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
            <CreditCard className="text-indigo-600 w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">Payments</h2>
            <p className="text-zinc-500 text-sm font-medium">Manage and process payments for approved subscriptions</p>
          </div>
        </div>
        <button className="w-11 h-11 bg-white rounded-xl flex items-center justify-center border border-indigo-50 shadow-sm text-zinc-400 hover:text-indigo-600 transition-colors">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      {/* Bulk Action Bar - Updated with Inputs */}
      <AnimatePresence>
        {selectedIds.size > 0 && view === 'pending' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="mb-6 p-1 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-3xl shadow-2xl shadow-indigo-100"
          >
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-3 px-2 border-r border-white/20 mr-2">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="text-white">
                  <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Selected</p>
                  <p className="font-black text-xl leading-none">{selectedIds.size}</p>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div className="relative group">
                  <label className="text-[10px] font-black text-white/70 uppercase tracking-wider mb-1 block ml-1">Payment Mode</label>
                  <div className="relative">
                    <select 
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:ring-2 focus:ring-white outline-none appearance-none transition-all cursor-pointer backdrop-blur-sm"
                    >
                      <option className="text-zinc-700" value="UPI">UPI</option>
                      <option className="text-zinc-700" value="Net Banking">Net Banking</option>
                      <option className="text-zinc-700" value="Credit Card">Credit Card</option>
                      <option className="text-zinc-700" value="Debit Card">Debit Card</option>
                      <option className="text-zinc-700" value="Cash">Cash</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                  </div>
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black text-white/70 uppercase tracking-wider mb-1 block ml-1">Transaction ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. TSI-0001"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder:text-white/40 focus:ring-2 focus:ring-white outline-none transition-all backdrop-blur-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleBatchSubmit}
                className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all active:scale-95 flex items-center gap-2 shadow-2xl shadow-indigo-900/20 whitespace-nowrap min-w-[160px] justify-center"
              >
                Submit Payment
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card">
        <div className="flex border-b border-indigo-50">
          <button
            onClick={() => { setView('pending'); setSelectedIds(new Set()); }}
            className={`flex-1 py-3 text-sm font-bold transition-all ${view === 'pending' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Pending
          </button>

          <button
            onClick={() => { setView('history'); setSelectedIds(new Set()); }}
            className={`flex-1 py-3 text-sm font-bold transition-all ${view === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            History
          </button>
        </div>

        <div className="p-4 bg-zinc-50/50 border-b border-indigo-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-indigo-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-indigo-50">
                {view === 'pending' ? (
                  <>
                    <th className="table-header text-center whitespace-nowrap px-4 py-3 min-w-[120px]">
                      <div className="flex justify-center">Action</div>
                    </th>
                    <th className="table-header text-center whitespace-nowrap">Timestamp</th>
                    <th className="table-header text-center whitespace-nowrap">Planned Date</th>
                    <th className="table-header text-center whitespace-nowrap">Subscription No</th>
                    <th className="table-header whitespace-nowrap">Company</th>
                    <th className="table-header whitespace-nowrap">Name of the Person</th>
                    <th className="table-header whitespace-nowrap">Category of subscription</th>
                    <th className="table-header whitespace-nowrap">Name of Subscription</th>
                    <th className="table-header whitespace-nowrap">Vendor Name</th>
                    <th className="table-header text-center whitespace-nowrap">Price</th>
                  </>
                ) : (
                  <>
                    <th className="table-header py-4 px-4 whitespace-nowrap flex items-center gap-1">Payment Date <ArrowUpDown className="w-3 h-3"/></th>
                    <th className="table-header py-4 px-4 whitespace-nowrap text-center">Subscription No</th>
                    <th className="table-header py-4 px-4 whitespace-nowrap">Company</th>
                    <th className="table-header py-4 px-4 whitespace-nowrap">Name of the Person</th>
                    <th className="table-header py-4 px-4 whitespace-nowrap">Category of subscription</th>
                    <th className="table-header py-4 px-4 whitespace-nowrap">Name of Subscription</th>
                    <th className="table-header py-4 px-4 whitespace-nowrap">Vendor Name</th>
                    <th className="table-header py-4 px-4 whitespace-nowrap text-center">Price</th>
                    <th className="table-header py-4 px-4 whitespace-nowrap text-center">Payment Mode</th>
                    <th className="table-header py-4 px-4 whitespace-nowrap text-center">Transaction ID</th>
                    <th className="table-header py-4 px-4 whitespace-nowrap text-center flex items-center justify-center gap-1">Start Date <ArrowUpDown className="w-3 h-3"/></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/50">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-24 text-center text-zinc-300 font-medium italic">
                    {view === 'pending' ? 'No pending payments found' : 'No active subscriptions found'}
                  </td>
                </tr>
              ) : (
                filteredSubs.map(sub => (
                  <tr key={sub.id} className="hover:bg-indigo-50/20 transition-colors group">
                    {view === 'pending' ? (
                      <>
                        <td className="table-cell py-4 px-4 align-middle text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => toggleSelection(sub.id)}
                              className={`p-2 rounded-xl border-2 transition-all active:scale-90 ${
                                selectedIds.has(sub.id)
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                                  : 'bg-white border-zinc-200 text-zinc-400 hover:border-indigo-400 hover:text-indigo-400'
                              }`}
                              title="Select to mark as done"
                            >
                              {selectedIds.has(sub.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                            <button
                              onClick={() => openPaymentModal(sub)}
                              className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all active:scale-95 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                              title="Payment Link"
                            >
                              <Link className="w-3.5 h-3.5" />
                              <span>Link</span>
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
                        <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-[10px] font-medium text-center">
                          {sub.startDate && !isNaN(new Date(sub.startDate).getTime()) ? new Date(sub.startDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="table-cell py-4 px-4 align-middle font-mono text-xs text-zinc-500 text-center">{sub.subscriptionNo}</td>
                        <td className="table-cell py-4 px-4 align-middle text-zinc-600 font-bold">{sub.companyName}</td>
                        <td className="table-cell py-4 px-4 align-middle text-zinc-600">{sub.subscriberName}</td>
                        <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-xs">{sub.category}</td>
                        <td className="table-cell py-4 px-4 align-middle text-indigo-600 font-bold">{sub.subscriptionType || '-'}</td>
                        <td className="table-cell py-4 px-4 align-middle text-indigo-900 text-xs font-bold">{sub.subscriptionName}</td>
                        <td className="table-cell py-4 px-4 align-middle font-black text-emerald-600 text-center whitespace-nowrap">₹{sub.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </>
                    ) : (
                      <>
                        <td className="table-cell py-4 px-4 align-middle text-zinc-600 font-medium whitespace-nowrap">
                          {sub.approvedOn || (sub.startDate && new Date(sub.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })) || '-'}
                        </td>
                        <td className="table-cell py-4 px-4 align-middle font-mono text-zinc-500 font-bold text-center">{sub.subscriptionNo}</td>
                        <td className="table-cell py-4 px-4 align-middle text-zinc-600 font-bold">{sub.companyName}</td>
                        <td className="table-cell py-4 px-4 align-middle text-zinc-600">{sub.subscriberName}</td>
                        <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-xs">{sub.category}</td>
                        <td className="table-cell py-4 px-4 align-middle text-indigo-900 text-xs font-bold">{sub.subscriptionName}</td>
                        <td className="table-cell py-4 px-4 align-middle text-indigo-500 font-bold">{sub.subscriptionType || '-'}</td>
                        <td className="table-cell py-4 px-4 align-middle font-black text-emerald-600 text-center">₹{sub.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="table-cell py-4 px-4 align-middle text-center">
                          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-100 whitespace-nowrap">
                            {sub.paymentMode || 'UPI'}
                          </span>
                        </td>
                        <td className="table-cell py-4 px-4 align-middle text-zinc-500 font-mono text-xs text-center">{sub.transactionId || 'TSI-' + sub.subscriptionNo.split('-')[1]}</td>
                        <td className="table-cell py-4 px-4 align-middle text-zinc-600 font-medium text-center whitespace-nowrap">
                          {sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
