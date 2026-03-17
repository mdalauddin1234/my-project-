import React from 'react';
import { SubscriptionStatus } from '../types';

interface StatusBadgeProps {
  status: SubscriptionStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case SubscriptionStatus.PENDING_APPROVAL:
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case SubscriptionStatus.PENDING_PAYMENT:
        return 'bg-violet-50 text-violet-600 border-violet-100';
      case SubscriptionStatus.PAID:
        return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case SubscriptionStatus.REJECTED:
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-zinc-50 text-zinc-600 border-zinc-100';
    }
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles()}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
