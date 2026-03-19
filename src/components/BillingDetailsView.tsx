import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, Search, Upload, ImageIcon, X, Check, FileText } from 'lucide-react';
import { Subscription, SubscriptionStatus } from '../types';

interface BillingRowProps {
  sub: Subscription;
  onActivate: (id: string, status: SubscriptionStatus, extraData: any) => void;
}

const BillingCard: React.FC<BillingRowProps> = ({ sub, onActivate }) => {
  const [startDate, setStartDate] = useState(sub.startDate ? sub.startDate.split('T')[0] : '');
  const [endDate, setEndDate] = useState(sub.endDate ? sub.endDate.split('T')[0] : '');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleActivate = () => {
    if (!photoUrl) return;
    onActivate(sub.id, SubscriptionStatus.ACTIVE, {
      photoUrl,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-indigo-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row items-center gap-6"
    >
      {/* Identity */}
      <div className="w-full lg:w-48 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="font-black text-indigo-900 text-sm tracking-tight">{sub.subscriptionNo}</span>
        </div>
        <h4 className="text-sm font-bold text-zinc-700 line-clamp-1">{sub.subscriptionName}</h4>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-zinc-400 font-bold uppercase">{sub.companyName}</p>
          {sub.renewalNo && (
            <span className="text-[9px] font-mono text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded leading-none">
              {sub.renewalNo}
            </span>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Start Date</label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-indigo-50 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">End Date</label>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-indigo-50 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Upload & Action */}
      <div className="w-full lg:w-auto flex items-center gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-indigo-50">
        <div className="relative flex-1 lg:flex-none">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id={`upload-${sub.id}`}
          />
          <label
            htmlFor={`upload-${sub.id}`}
            className={`w-full lg:w-32 h-14 flex items-center justify-center gap-2 bg-zinc-50 border-2 border-dashed border-indigo-100 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all overflow-hidden ${photoUrl ? 'border-emerald-400 bg-emerald-50/30' : ''}`}
          >
            {photoUrl ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded border border-emerald-200 overflow-hidden">
                  <img src={photoUrl} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Change</span>
              </div>
            ) : (
              <>
                <Upload className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-black text-indigo-600 uppercase">Upload Bill</span>
              </>
            )}
          </label>
        </div>

        <button
          disabled={!photoUrl || isUploading}
          onClick={handleActivate}
          className="h-14 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:grayscale text-white rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95 flex-1 lg:flex-none"
        >
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span className="text-sm font-bold">Submit</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

interface BillingDetailsViewProps {
  subscriptions: Subscription[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  updateStatus: (id: string, status: SubscriptionStatus, extraData?: any) => void;
}

export const BillingDetailsView: React.FC<BillingDetailsViewProps> = ({
  subscriptions,
  searchQuery,
  setSearchQuery,
  updateStatus
}) => {
  const filteredSubs = React.useMemo(() => {
    let filtered = subscriptions.filter(s => s.status === SubscriptionStatus.PAID);

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
  }, [subscriptions, searchQuery]);

  return (
    <motion.div
      key="billing-details"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
            <Receipt className="text-indigo-600 w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">Billing Details</h2>
            <p className="text-zinc-500 text-sm font-medium">Quick activation: Set dates and upload your bill</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-white/50 backdrop-blur-sm border border-indigo-50 rounded-2xl flex items-center gap-4 sticky top-0 z-10 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search subscriptions waiting for billing..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 pb-10">
          {filteredSubs.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-indigo-50 rounded-3xl py-20 flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-indigo-300" />
              </div>
              <h3 className="font-black text-indigo-900 text-lg">All caught up!</h3>
              <p className="text-zinc-400 text-sm max-w-xs mx-auto">No subscriptions are currently waiting for billing details and activation.</p>
            </div>
          ) : (
            filteredSubs.map(sub => (
              <BillingCard 
                key={sub.id} 
                sub={sub} 
                onActivate={updateStatus} 
              />
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
