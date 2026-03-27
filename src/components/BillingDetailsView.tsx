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
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      step: 'Audit'
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-indigo-100 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all space-y-6"
    >
      {/* Detail Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-6 gap-x-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Subscription No</label>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-50 rounded flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <p className="text-sm font-black text-indigo-900">{sub.subscriptionNo}</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Renewal ID</label>
          <p className="text-sm font-bold text-zinc-800 font-mono italic">{sub.renewalNo || '-'}</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Renewal No</label>
          <p className="text-sm font-bold text-zinc-800 font-mono italic">{sub.renewalCount || '-'}</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Name of the Person</label>
          <p className="text-sm font-bold text-zinc-800">{sub.subscriberName}</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Company Name</label>
          <p className="text-sm font-bold text-zinc-800">{sub.companyName}</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Category of subscription</label>
          <p className="text-sm font-bold text-zinc-800 underline decoration-indigo-200 underline-offset-4">{sub.category}</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Name of Subscription</label>
          <p className="text-sm font-black text-indigo-600">{sub.subscriptionName}</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Vendor Name</label>
          <p className="text-sm font-bold text-zinc-800">{sub.subscriptionType || '-'}</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Frequency</label>
          <p className="text-sm font-bold text-zinc-500">{sub.frequency}</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Price</label>
          <p className="text-sm font-black text-emerald-600">₹{sub.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

      </div>

      <div className="h-px bg-indigo-50 w-full" />

      {/* Action Section */}
      <div className="flex flex-col lg:flex-row items-end lg:items-center gap-6 pt-2">
        {/* Dates Selection */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1 block">Set Activation Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-5 py-3.5 bg-zinc-50 border border-indigo-100 rounded-2xl text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1 block">Set Expiry End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-5 py-3.5 bg-zinc-50 border border-indigo-100 rounded-2xl text-sm font-bold text-zinc-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Upload & Submit */}
        <div className="w-full lg:w-auto flex items-center gap-4 shrink-0">
          <div className="relative flex-1 lg:flex-none">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id={`upload-${sub.id}`}
            />
            <label
              htmlFor={`upload-${sub.id}`}
              className={`w-full lg:w-44 h-16 flex items-center justify-center gap-3 bg-white border-2 border-dashed rounded-2xl cursor-pointer hover:bg-indigo-50 transition-all overflow-hidden shadow-sm ${photoUrl ? 'border-emerald-500 bg-emerald-50/20' : 'border-indigo-200 hover:border-indigo-400'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${photoUrl ? 'bg-emerald-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                {photoUrl ? (
                  photoUrl.startsWith('data:application/pdf') ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <div className="flex flex-col items-start pr-2">
                <span className={`text-[10px] font-black uppercase tracking-tight ${photoUrl ? 'text-emerald-700' : 'text-zinc-400'}`}>
                  {photoUrl ? (photoUrl.startsWith('data:application/pdf') ? 'PDF Ready' : 'Image Ready') : (
                    <>Upload Bill <span className="text-rose-500 text-xs">*</span></>
                  )}
                </span>
                <span className="text-[8px] font-bold text-zinc-400 lowercase">click to {photoUrl ? 'change' : 'browse'}</span>
              </div>
            </label>
          </div>

          <button
            disabled={!photoUrl || isUploading}
            onClick={handleActivate}
            className="h-16 px-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:grayscale text-white rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 transition-all active:scale-95 flex-1 lg:flex-none"
          >
            {isUploading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-6 h-6" />
                <span className="text-base font-black tracking-wide">Submit</span>
              </>
            )}
          </button>
        </div>
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
    let filtered = subscriptions.filter(s => 
      s.status === SubscriptionStatus.PAID && 
      (!s.step || s.step === '' || s.step === '-')
    );

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
