import React from 'react';
import { motion } from 'motion/react';
import { Image as ImageIcon, Copy } from 'lucide-react';
import { Subscription, SubscriptionStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { PostCopyForm } from './PostCopyForm';

interface PostCopyViewProps {
  filteredSubscriptions: Subscription[];
  updateStatus: (id: string, status: SubscriptionStatus, extraData: any) => void;
}

export const PostCopyView: React.FC<PostCopyViewProps> = ({
  filteredSubscriptions,
  updateStatus
}) => {
  return (
    <motion.div
      key="post-copy"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Standardized Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
            <Copy className="text-indigo-600 w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">Post Copy</h2>
            <p className="text-zinc-500 text-sm font-medium">Enter start & end dates further to activate subscriptions</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredSubscriptions.map(sub => (
          <div key={sub.id} className="card p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-zinc-900">{sub.subscriptionName}</h3>
                    <span className="text-[10px] font-mono bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded border border-zinc-200">
                      {sub.subscriptionNo}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm">{sub.companyName} • {sub.subscriberName}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                    <span className="flex items-center gap-1 font-bold text-indigo-600">₹{sub.price.toLocaleString()}</span>
                    <span>•</span>
                    <span>{sub.frequency}</span>
                    <span>•</span>
                    <span className="italic">Approved on: {sub.approvedOn || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <StatusBadge status={sub.status} />
            </div>
            <div className="mb-6 bg-zinc-50 p-4 rounded-xl border border-indigo-50">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Purpose of Subscription</p>
              <p className="text-sm text-zinc-600 leading-relaxed">{sub.details}</p>
            </div>
            <PostCopyForm
              onSubmit={(data) => updateStatus(sub.id, SubscriptionStatus.ACTIVE, data)}
            />
          </div>
        ))}
        {filteredSubscriptions.length === 0 && (
          <div className="card p-16 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <Copy className="w-8 h-8 text-indigo-300" />
            </div>
            <p className="text-zinc-400 font-medium">No subscriptions waiting for post copy</p>
            <p className="text-zinc-300 text-sm mt-1">Once payment is processed, subscriptions will appear here</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
