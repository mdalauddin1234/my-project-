import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays,
  TrendingUp,
  RotateCcw,
  ClipboardList,
  Activity,
  CheckSquare,
  CreditCard,
  Clock,
  Building2,
  X,
  ChevronDown,
  ChevronUp,
  Shield,
  Terminal,
  FileCheck,
  Home,
  PanelRight,
  Monitor,
  Car,
  UserCheck,
  Building,
  Users,
  TrendingDown,
  Trophy,
  ArrowUpRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DashboardCard } from './DashboardCard';
import { Subscription, SubscriptionStatus, Frequency } from '../types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface DashboardViewProps {
  subscriptions: Subscription[];
  counts: any; // Fallback counts
  statusData: any[]; // Fallback data from parent
  COLORS: string[];
}


const RenewalItem: React.FC<{ sub: Subscription }> = ({ sub }) => {
  const getCategoryIcon = (category?: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('insurance')) return <Shield className="w-3 h-3" />;
    if (cat.includes('software') || cat.includes('it')) return <Terminal className="w-3 h-3" />;
    if (cat.includes('compliance') || cat.includes('government') || cat.includes('license')) return <FileCheck className="w-3 h-3" />;
    if (cat.includes('tax')) return <Activity className="w-3 h-3" />;
    if (cat.includes('vehicle')) return <Car className="w-3 h-3" />;
    if (cat.includes('membership')) return <Users className="w-3 h-3" />;
    if (cat.includes('domain') || cat.includes('email')) return <Monitor className="w-3 h-3" />;
    if (cat.includes('maintenance') || cat.includes('amc')) return <Building2 className="w-3 h-3" />;
    if (cat.includes('banking') || cat.includes('financial')) return <CreditCard className="w-3 h-3" />;
    if (cat.includes('professional') || cat.includes('consultancy')) return <UserCheck className="w-3 h-3" />;
    return <ClipboardList className="w-3 h-3" />;
  };

  const getCategoryColor = (category?: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('insurance')) return 'text-emerald-600 bg-emerald-50';
    if (cat.includes('software')) return 'text-purple-600 bg-purple-50';
    if (cat.includes('compliance')) return 'text-orange-600 bg-orange-50';
    if (cat.includes('tax')) return 'text-rose-600 bg-rose-50';
    if (cat.includes('vehicle')) return 'text-blue-600 bg-blue-50';
    if (cat.includes('membership')) return 'text-pink-600 bg-pink-50';
    return 'text-indigo-600 bg-indigo-50';
  };

  return (
    <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-indigo-50 hover:border-indigo-200 transition-all group">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-current/10 shrink-0 ${getCategoryColor(sub.category)}`}>
          {getCategoryIcon(sub.category)}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black text-zinc-900 leading-tight truncate">{sub.subscriptionName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50/50 px-1 rounded-sm truncate">{sub.category || 'Other'}</span>
            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter truncate">{sub.subscriptionType || 'General'}</span>
          </div>
        </div>
      </div>
      <div className="text-right ml-3 shrink-0">
        <p className="text-[11px] font-black text-emerald-600 leading-none mb-0.5">₹{sub.price.toLocaleString()}</p>
        <p className="text-[8px] text-zinc-400 font-black uppercase tracking-tighter">{sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}</p>
      </div>
    </div>
  );
};

const getDisplayCategory = (s: Subscription) => {
  const combined = `${s.category} ${s.subscriptionType} ${s.subscriptionName} ${s.details}`.toLowerCase();
  if (combined.includes('membership') || combined.includes('association')) return 'Membership services';
  if (combined.includes('insurance') || combined.includes('policy')) return 'Insurance / Policies';
  if (combined.includes('software') || combined.includes('it') || combined.includes('digital') || combined.includes('saas') || combined.includes('domain')) return 'IT / Domain Renewal';
  if (combined.includes('compliance') || combined.includes('license') || combined.includes('government') || combined.includes('legal')) return 'Government / Compliance / Licenses';
  if (combined.includes('road tax')) return 'Road Tax services';
  if (combined.includes('vehicle') || combined.includes('transport')) return 'Vehicle & Transport Services';
  if (combined.includes('professional') || combined.includes('consultancy')) return 'Professional services';
  return s.category || 'Other';
};

export const DashboardView: React.FC<DashboardViewProps> = ({ subscriptions, COLORS }) => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isExpiringSoon = (endDate?: string) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const filteredSubscriptions = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return subscriptions;

    return subscriptions.filter(sub => {
      // Robust parsing for M/D/YYYY H:mm:ss or ISO
      let subDate = new Date(sub.createdAt);
      if (isNaN(subDate.getTime()) && sub.createdAt.includes('/')) {
        const [dPart, tPart] = sub.createdAt.split(' ');
        if (dPart) {
          const [m, d, y] = dPart.split('/').map(Number);
          if (tPart) {
            const [h, min, s] = tPart.split(':').map(Number);
            subDate = new Date(y, m - 1, d, h, min, s);
          } else {
            subDate = new Date(y, m - 1, d);
          }
        }
      }

      if (isNaN(subDate.getTime())) return true;

      const start = dateRange.start ? new Date(dateRange.start + 'T00:00:00') : new Date(0);
      const end = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : new Date();

      return subDate >= start && subDate <= end;
    });
  }, [subscriptions, dateRange]);

  const activeCounts = useMemo(() => {
    const allRelevant = subscriptions.filter(s => s.status !== SubscriptionStatus.REJECTED);

    // Robust search across all fields to ensure matches even if mapping is slightly off
    const countByIncludes = (search: string) => allRelevant.filter(s => {
      const combined = `${s.category} ${s.subscriptionType} ${s.subscriptionName} ${s.details}`.toLowerCase();
      return combined.includes(search.toLowerCase());
    }).length;

    return {
      renewals: filteredSubscriptions.filter(s => isExpiringSoon(s.endDate)).length,
      pendingApproval: filteredSubscriptions.filter(s => s.status === SubscriptionStatus.PENDING_APPROVAL).length,
      payments: filteredSubscriptions.filter(s => s.status === SubscriptionStatus.PENDING_PAYMENT).length,
      postCopy: filteredSubscriptions.filter(s => s.status === SubscriptionStatus.PAID).length,
      active: filteredSubscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE).length,
      totalValue: filteredSubscriptions.reduce((acc, s) => acc + s.price, 0),
      renewalValue: filteredSubscriptions.filter(s => isExpiringSoon(s.endDate)).reduce((acc, s) => acc + s.price, 0),
      insurance: countByIncludes('Insurance') || countByIncludes('Policy'),
      software: countByIncludes('Software') || countByIncludes('IT') || countByIncludes('Digital') || countByIncludes('SaaS'),
      compliance: countByIncludes('Compliance') || countByIncludes('License') || countByIncludes('Government') || countByIncludes('Legal'),
      totalAnnualCost: filteredSubscriptions.reduce((acc, s) => {
        let multiplier = 1;
        if (s.frequency === Frequency.MONTHLY) multiplier = 12;
        else if (s.frequency === Frequency.QUARTERLY) multiplier = 4;
        else if (s.frequency === Frequency.HALF_YEARLY) multiplier = 2;
        return acc + (s.price * multiplier);
      }, 0),
      annualCostByCategory: filteredSubscriptions.reduce((acc, s) => {
        const cat = getDisplayCategory(s);
        let multiplier = 1;
        if (s.frequency === Frequency.MONTHLY) multiplier = 12;
        else if (s.frequency === Frequency.QUARTERLY) multiplier = 4;
        else if (s.frequency === Frequency.HALF_YEARLY) multiplier = 2;
        const subAnnual = s.price * multiplier;
        acc[cat] = (acc[cat] || 0) + subAnnual;
        return acc;
      }, {} as Record<string, number>),
      membership: countByIncludes('Membership') || countByIncludes('Association'),
      currentMonthSubs: subscriptions.filter(s => s.billingMonth === MONTHS[new Date().getMonth()]).length,
      nextMonthRenewal: subscriptions.filter(s => {
        if (!s.nextRenewalDate) return false;
        const d = new Date(s.nextRenewalDate);
        const nextMonth = (new Date().getMonth() + 1) % 12;
        return d.getMonth() === nextMonth && d.getFullYear() === (nextMonth === 0 ? new Date().getFullYear() + 1 : new Date().getFullYear());
      }).length,
      expiringSoonCount: subscriptions.filter(s => {
        if (!s.nextRenewalDate) return false;
        const d = new Date(s.nextRenewalDate);
        const diff = d.getTime() - new Date().getTime();
        const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      }).length,
      overdueCount: subscriptions.filter(s => {
        if (!s.nextRenewalDate) return false;
        const d = new Date(s.nextRenewalDate);
        return d < new Date() && s.status !== SubscriptionStatus.PAID && s.status !== SubscriptionStatus.ACTIVE;
      }).length,
    };
  }, [filteredSubscriptions, subscriptions]);

  const topSubscriptions = useMemo(() => {
    return [...filteredSubscriptions]
      .sort((a, b) => b.price - a.price)
      .slice(0, 10);
  }, [filteredSubscriptions]);

  // Pre-sorted for DashboardCard display
  const sortedByPriceDesc = useMemo(() => {
    return [...filteredSubscriptions].sort((a, b) => b.price - a.price);
  }, [filteredSubscriptions]);

  const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#f97316', '#6366f1', '#14b8a6', '#f43f5e', '#a855f7'];

  const categoryDistributionData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredSubscriptions.forEach(s => {
      const name = getDisplayCategory(s);
      cats[name] = (cats[name] || 0) + 1;
    });

    return Object.entries(cats)
      .map(([name, value], i) => ({
        name,
        value,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSubscriptions]);

  const renewalStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const pending = filteredSubscriptions.filter(s => {
      if (!s.endDate) return false;
      const end = new Date(s.endDate);
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });

    const upcoming = filteredSubscriptions.filter(s => {
      if (!s.endDate) return false;
      const end = new Date(s.endDate);
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 7 && diffDays <= 30;
    });

    const thisMonthRows = filteredSubscriptions.filter(s => {
      if (!s.endDate) return false;
      const end = new Date(s.endDate);
      return end.getMonth() === currentMonth && end.getFullYear() === currentYear;
    });

    return {
      pending,
      upcoming,
      thisMonth: {
        count: thisMonthRows.length,
        amount: thisMonthRows.reduce((acc, s) => acc + s.price, 0),
        monthName: now.toLocaleString('default', { month: 'long' })
      }
    };
  }, [filteredSubscriptions]);

  const activeStatusData = useMemo(() => {
    const data = Object.values(SubscriptionStatus).map(status => ({
      name: status.replace('_', ' ').toLowerCase(),
      value: filteredSubscriptions.filter(s => s.status === status).length,
    })).filter(d => d.value > 0);
    return data;
  }, [filteredSubscriptions]);

  const clearFilter = () => {
    setDateRange({ start: '', end: '' });
    setShowDatePicker(false);
  };

  const hasFilter = dateRange.start || dateRange.end;

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Standardized Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
            <Home className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">Dashboard</h2>
            <p className="text-zinc-500 text-sm font-medium">View your Subscription analytics</p>
          </div>
        </div>
        <button className="w-11 h-11 bg-white rounded-xl flex items-center justify-center border border-indigo-50 shadow-sm text-indigo-950/40 hover:text-indigo-600 transition-colors">
          <PanelRight className="w-5 h-5" />
        </button>
      </div>

      {/* Date Picker Integrated Card - Right Aligned */}
      <div className="flex justify-end mb-6">
        <div className="bg-white p-2 rounded-[22px] shadow-sm border border-indigo-50 inline-flex items-center min-w-[320px] relative">
            <div className="flex items-center gap-1 w-full">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-black tracking-tight transition-all flex-1 text-left ${hasFilter
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-zinc-500 hover:bg-zinc-50'
                  }`}
              >
                <CalendarDays className="w-5 h-5 opacity-40 shrink-0" />
                <span className="flex-1">
                  {hasFilter
                    ? `${dateRange.start || '...'} to ${dateRange.end || '...'}`
                    : 'Pick date range'
                  }
                </span>
                {showDatePicker ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
              </button>

              {hasFilter && (
                <button
                  onClick={clearFilter}
                  className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  title="Clear Filter"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {showDatePicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-3 z-50 bg-white border border-indigo-100 rounded-[32px] shadow-2xl p-8 min-w-[380px]"
                >
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">From Date</span>
                      <div className="bg-zinc-50 border border-indigo-50 rounded-2xl px-4 py-3">
                        <input
                          type="date"
                          className="bg-transparent text-sm font-black text-indigo-950 outline-none w-full cursor-pointer"
                          value={dateRange.start}
                          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">To Date</span>
                      <div className="bg-zinc-50 border border-indigo-50 rounded-2xl px-4 py-3">
                        <input
                          type="date"
                          className="bg-transparent text-sm font-black text-indigo-950 outline-none w-full cursor-pointer"
                          value={dateRange.end}
                          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-8 mt-8 border-t border-indigo-50">
                    <button
                      onClick={clearFilter}
                      className="text-xs font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors"
                    >
                      Clear Filter
                    </button>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="px-8 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-[0.1em] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200"
                    >
                      Apply Filter
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      {/* Unified Total Subscriptions Card */}
      < div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm" >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-indigo-950 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <ClipboardList className="w-6 h-6" />
            </div>
            Total Subscription
          </h3>
          <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
            Current Status
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Active */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50 hover:bg-blue-50 transition-colors group">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:rotate-6 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Active</p>
              <h4 className="text-2xl font-black text-indigo-950">{activeCounts.active}</h4>
            </div>
          </div>

          {/* Insurance */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 hover:bg-emerald-50 transition-colors group">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:rotate-6 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Insurance</p>
              <h4 className="text-2xl font-black text-indigo-950">{activeCounts.insurance}</h4>
            </div>
          </div>

          {/* Software */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-purple-50/50 border border-purple-100/50 hover:bg-purple-50 transition-colors group">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-200 group-hover:rotate-6 transition-transform">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Software</p>
              <h4 className="text-2xl font-black text-indigo-950">{activeCounts.software}</h4>
            </div>
          </div>

          {/* Compliance */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-orange-50/50 border border-orange-100/50 hover:bg-orange-50 transition-colors group">
            <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200 group-hover:rotate-6 transition-transform">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Compliance</p>
              <h4 className="text-2xl font-black text-indigo-950">{activeCounts.compliance}</h4>
            </div>
          </div>
        </div>
      </div >

      {/* Billing Cycle Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Current Month Sub"
          value={activeCounts.currentMonthSubs}
          subtitle={`Paid for ${MONTHS[new Date().getMonth()]}`}
          icon={<CalendarDays className="w-5 h-5" />}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
          borderColor="border-indigo-100"
        />
        <DashboardCard
          title="Next Month Renewal"
          value={activeCounts.nextMonthRenewal}
          subtitle={`Renewing in ${MONTHS[(new Date().getMonth() + 1) % 12]}`}
          icon={<RotateCcw className="w-5 h-5" />}
          color="text-purple-600"
          bgColor="bg-purple-50"
          borderColor="border-purple-100"
        />
        <DashboardCard
          title="Expiring Soon"
          value={activeCounts.expiringSoonCount}
          subtitle="Within 7 Days"
          icon={<Clock className="w-5 h-5" />}
          color="text-amber-600"
          bgColor="bg-amber-50"
          borderColor="border-amber-100"
        />
        <DashboardCard
          title="Overdue"
          value={activeCounts.overdueCount}
          subtitle="Passed Renewal Date"
          icon={<Activity className="w-5 h-5" />}
          color="text-rose-600"
          bgColor="bg-rose-50"
          borderColor="border-rose-100"
        />
      </div>

      {/* Row 1: Cost Overview */}
      < div className="grid grid-cols-1 lg:grid-cols-3 gap-6" >
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <DashboardCard
              title="Total Values (Base)"
              value={`₹${activeCounts.totalValue.toLocaleString()}`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="text-indigo-600"
              bgColor="bg-indigo-50"
              borderColor="border-indigo-100"
              valueColor="text-emerald-600"
            >
              <div className="space-y-2 mt-4 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredSubscriptions.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 text-center py-4">No data</p>
                ) : (
                  sortedByPriceDesc.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-2 bg-white/50 rounded-xl border border-indigo-50/50 hover:bg-white transition-all">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                          <Building2 className="w-3 h-3 text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black text-indigo-950 truncate">{sub.subscriptionName}</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 ml-2">₹{sub.price.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </DashboardCard>
            <DashboardCard
              title="Estimated Annual Cost"
              value={`₹${activeCounts.totalAnnualCost.toLocaleString()}`}
              icon={<CreditCard className="w-6 h-6" />}
              color="text-rose-600"
              bgColor="bg-rose-50"
              borderColor="border-rose-100"
              gradient="linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)"
              subtitle="Projected Yearly Spent"
              trend={{ value: 'Enterprise', isUp: true }}
              valueColor="text-emerald-600"
            >
              <div className="space-y-2 max-h-[100px] overflow-y-auto pr-1 mt-2 custom-scrollbar">
                {Object.entries(activeCounts.annualCostByCategory)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([cat, amount]) => (
                    <div key={cat} className="flex items-center justify-between group/cat">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400 group-hover/cat:scale-125 transition-transform" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight truncate max-w-[80px]">{cat}</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600">₹{amount.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </DashboardCard>
          </div>
        </div>

        {/* Upcoming Renewal Card */}
        <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-indigo-950 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-violet-600" />
              Upcoming Renewal
            </h3>
            <div className="text-right">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{renewalStats.thisMonth.monthName}</p>
              <p className="text-xs font-black text-emerald-600">₹{renewalStats.thisMonth.amount.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {/* Summary Row */}
            <div className="grid grid-cols-2 gap-3 pb-4 border-b border-indigo-50">
              <div className="bg-violet-50 p-3 rounded-2xl border border-violet-100">
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest leading-tight">This Month</p>
                <h4 className="text-lg font-black text-violet-700">{renewalStats.thisMonth.count}</h4>
              </div>
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest leading-tight">Pending</p>
                <h4 className="text-lg font-black text-amber-700">{renewalStats.pending.length}</h4>
              </div>
            </div>

            {/* Pending List */}
            {renewalStats.pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Due Within 7 Days
                </p>
                {renewalStats.pending.map(sub => (
                  <RenewalItem key={sub.id} sub={sub} />
                ))}
              </div>
            )}

            {/* Upcoming List */}
            {renewalStats.upcoming.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Upcoming (Next 30 Days)</p>
                {renewalStats.upcoming.map(sub => (
                  <RenewalItem key={sub.id} sub={sub} />
                ))}
              </div>
            )}

            {renewalStats.pending.length === 0 && renewalStats.upcoming.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-10">
                <RotateCcw className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-xs">No imminent renewals</p>
              </div>
            )}
          </div>
        </div>
      </div >

      {/* Row 2: Secondary Stats */}
      < div className="grid grid-cols-1 md:grid-cols-2 gap-6" >
        <DashboardCard
          title="Pending Approvals"
          value={activeCounts.pendingApproval}
          subtitle={`${activeCounts.pendingApproval} Subscriptions`}
          icon={<CheckSquare className="w-5 h-5" />}
          color="text-amber-600"
          bgColor="bg-amber-50"
          borderColor="border-amber-100"
          layout="horizontal"
        />
        <DashboardCard
          title="Pending Payments"
          value={activeCounts.payments}
          subtitle={`${activeCounts.payments} Subscriptions`}
          icon={<CreditCard className="w-5 h-5" />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          borderColor="border-emerald-100"
          layout="horizontal"
        />
      </div >


      {/* Row 3: Subscription Status Analytics */}
      <div className="mt-8">
        <div className="bg-white p-8 rounded-[40px] border border-indigo-100 shadow-sm flex flex-col md:flex-row items-center gap-12">
          <div className="w-full md:w-1/2">
            <h3 className="text-xl font-black text-indigo-950 mb-1 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Subscription Status Overview
            </h3>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">Current Operational Lifecycle</p>

            <div className="grid grid-cols-2 gap-4 mt-8">
              {activeStatusData.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-indigo-50/50">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <div>
                    <p className="text-[10px] font-black text-indigo-950 uppercase truncate">{item.name}</p>
                    <p className="text-sm font-black text-indigo-600">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full md:w-1/2 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activeStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {activeStatusData.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '24px',
                    border: 'none',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#1e1b4b',
                    color: '#fff',
                    padding: '12px 20px'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '900' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      < div className="mt-8 grid grid-cols-1 gap-6" >
        <div className="bg-white p-8 rounded-[40px] border border-indigo-100 shadow-sm overflow-hidden relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100 shadow-sm">
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-indigo-950">Top 10 Highest Cost Subscriptions</h3>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-0.5">High Value Assets</p>
              </div>
            </div>
            <div className="hidden md:flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-50" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            {topSubscriptions.length > 0 ? (
              topSubscriptions.map((sub, index) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 transition-all border border-transparent hover:border-indigo-50 group cursor-default"
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shadow-sm ${index === 0 ? 'bg-amber-100 text-amber-600' :
                    index === 1 ? 'bg-slate-100 text-slate-500' :
                      index === 2 ? 'bg-orange-50 text-orange-600' :
                        'bg-indigo-50 text-indigo-400'
                    }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-indigo-950 truncate group-hover:text-indigo-600 transition-colors">{sub.subscriptionName}</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3 h-3 opacity-30" />
                      {sub.companyName}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-sm font-black text-emerald-600">
                      ₹{sub.price.toLocaleString()}
                      <ArrowUpRight className="w-3 h-3 opacity-30" />
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{sub.frequency}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-12 text-center text-zinc-400">
                <p className="text-sm">No subscription data available</p>
              </div>
            )}
          </div>
        </div>
      </div >

      {/* Row 4: Consolidated Category of Subscriptions Analytics */}
      < div className="mt-8 grid grid-cols-1 gap-6" >
        <div className="bg-white p-8 rounded-[40px] border border-indigo-100 shadow-sm min-h-[450px]">
          <div className="flex flex-col lg:flex-row gap-12">

            {/* Left Column: Pie Chart Distribution */}
            <div className="lg:w-1/3 flex flex-col">
              <div className="mb-8">
                <h3 className="text-xl font-black text-indigo-950 mb-1 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-indigo-500" />
                  Category of Subscriptions Distribution
                </h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Visual Asset Breakdown</p>
              </div>

              <div className="flex-1 flex items-center justify-center min-h-[300px]">
                {categoryDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '24px',
                          border: 'none',
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          padding: '12px 20px',
                          backgroundColor: '#1e1b4b',
                          color: '#fff'
                        }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '900' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-zinc-400 text-sm">No category data</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {categoryDistributionData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Key Metrics Grid */}
            <div className="lg:w-2/3 flex flex-col pt-4 lg:pt-0">
              <div className="mb-8 hidden lg:block">
                <h3 className="text-xl font-black text-indigo-950 mb-1">Category of Subscriptions Details</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Subscription Counts</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categoryDistributionData.map((item, index) => (
                  <div key={index} className="p-6 rounded-[32px] border border-indigo-50 hover:border-indigo-200 transition-all flex items-center justify-between group bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: item.color }}>
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-indigo-950">{item.name}</h4>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Total Registered</p>
                      </div>
                    </div>
                    <div className="text-3xl font-black text-indigo-950 group-hover:scale-110 transition-transform">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-8 border-t border-indigo-50/50 hidden lg:block">
                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-[24px]">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    <span className="text-xs font-black text-indigo-950 uppercase tracking-widest">Data sync accuracy 100%</span>
                  </div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Verified by System</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div >
    </motion.div >
  );
};
