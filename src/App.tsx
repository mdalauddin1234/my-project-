/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid,
  LayoutDashboard,
  ClipboardList,
  RotateCcw,
  CheckSquare,
  CreditCard,
  Home,
  Users as UserManagementIcon,
  LogOut,
  Search,
  ArrowUpDown,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Building2,
  User as UserIcon,
  Plus,
  PlusSquare,
  Trash2,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Upload,
  FileText,
  TrendingUp,
  Activity,
  CalendarDays,
  Clock,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subscription, SubscriptionStatus, Frequency, UserRole, User } from './types';

// Components
import { SidebarItem } from './components/SidebarItem';
import { DashboardView } from './components/DashboardView';
import { MySubscriptionsView } from './components/MySubscriptionsView';
import { PaymentsView } from './components/PaymentsView';
import { PendingApprovalView } from './components/PendingApprovalView';
import { RenewalsView } from './components/RenewalsView';
import { UserManagementView } from './components/UserManagementView';
import { SubscriptionForm } from './components/SubscriptionForm';
import { LoginView } from './components/LoginView';
import { BillingDetailsView } from './components/BillingDetailsView';
import { AccountAuditView } from './components/AccountAuditView';
import { ShieldCheck } from 'lucide-react';

// Services
import {
  fetchFromSheet,
  addSubscriptionToSheet,
  deleteSubscriptionFromSheet,
  updateSubscriptionInSheet,
  addToRenewalDB,
  addToAuditLogSheet,
  fetchFromRenewalDB,
  fetchUsersFromSheet,
  addUserToSheet,
  deleteUserFromSheet,
  fetchMastersFromSheet,
  addToBillingSheet,
  fetchAccountAuditFromSheet,
  updateAuditLogSheetEntry
} from './services/googleSheetService';

type TabType = 'dashboard' | 'new' | 'my-subscriptions' | 'renewals' | 'pending-approval' | 'payments' | 'billing-details' | 'account-audit' | 'user-management';

// Helper to calculate end date based on frequency
const calculateEndDate = (startDate: string, frequency: Frequency): string => {
  const date = new Date(startDate);
  if (isNaN(date.getTime())) return startDate;
  
  if (frequency === Frequency.MONTHLY) date.setMonth(date.getMonth() + 1);
  else if (frequency === Frequency.QUARTERLY) date.setMonth(date.getMonth() + 3);
  else if (frequency === Frequency.HALF_YEARLY) date.setMonth(date.getMonth() + 6);
  else if (frequency === Frequency.YEARLY) date.setFullYear(date.getFullYear() + 1);
  
  return date.toISOString();
};

// Stable helper — defined outside component so it never causes extra renders
const isExpiringSoon = (endDate?: string): boolean => {
  if (!endDate) return false;
  const end = new Date(endDate);
  const now = new Date();
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 5;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [mastersData, setMastersData] = useState<{ companies: string[], persons: string[], categories: Record<string, string[]> } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('subflow_active_tab');
    if (saved) return saved as TabType;
    return 'dashboard';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [renewalSubscription, setRenewalSubscription] = useState<Subscription | null>(null);
  const [auditLogData, setAuditLogData] = useState<any[]>([]);
  const lastActionTimeRef = React.useRef(0);

  const handleFetchFromSheet = React.useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastActionTimeRef.current < 30000) return;

    setIsSyncing(true);
    try {
      // Fetch masters first so we can pass it into fetchFromSheet (avoids a duplicate API call)
      const [syncedMasters, syncedUsers] = await Promise.all([
        fetchMastersFromSheet(),
        fetchUsersFromSheet()
      ]);

      if (syncedMasters !== null) setMastersData(syncedMasters);

      // Pass already-fetched masters so fetchFromSheet doesn't call fetchMastersFromSheet again
      const [syncedSubs, renewalData, auditData] = await Promise.all([
        fetchFromSheet(syncedMasters),
        fetchFromRenewalDB(),
        fetchAccountAuditFromSheet()
      ]);

      if (auditData) setAuditLogData(auditData);

      if (syncedSubs !== null) {
        // Merge renewalNo from renewalData based on subscriptionNo
        const mergedSubs = syncedSubs.map(sub => {
          if (renewalData && renewalData.length > 0) {
            const renewal = renewalData.find((r: any) => {
              const renSubNo = r.subscriptionno || r.subno || r.subscriptionno_;
              return renSubNo && renSubNo.toString().toUpperCase() === sub.subscriptionNo.toUpperCase();
            });
            if (renewal) {
              return { 
                ...sub, 
                renewalNo: String(renewal.renewalno || sub.renewalNo || ''),
                step: renewal.step && renewal.step !== '' && renewal.step !== '-' ? String(renewal.step) : sub.step,
                gmailId: String(renewal.gmailid || sub.gmailId || ''),
                how: String(renewal.how || sub.how || ''),
                query: String(renewal.query || sub.query || ''),
              };
            }
          }
          return sub;
        });
        
        setSubscriptions(mergedSubs);

        // Auto-log newly expiring subscriptions to the Renewal DB
        // mergedSubs.forEach(sub => {
        //   if (sub.status === SubscriptionStatus.ACTIVE && 
        //       isExpiringSoon(sub.endDate) && 
        //       (!sub.renewalNo || sub.renewalNo === '' || sub.renewalNo === '-')) {
        //     console.log("Auto-logging expiring subscription to Renewal DB:", sub.subscriptionNo);
        //     addToRenewalDB(sub);
        //   }
        // });
      }

      if (syncedUsers !== null) {
        const mappedUsers: User[] = syncedUsers.map((u, i) => {
          const getVal = (keys: string[]) => {
            for (const k of keys) {
              const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (u[cleanK] !== undefined && u[cleanK] !== '') return u[cleanK];
            }
            return '';
          };

          return {
            id: u.id || `user-${i}`,
            name: getVal(['name', 'fullname', 'displayname']) || 'Unknown',
            email: getVal(['email', 'emailid', 'mail']),
            username: getVal(['username', 'user', 'login']),
            password: (getVal(['password', 'pass', 'pwd']) || '').toString(),
            role: (getVal(['role', 'type']) || '').toString().trim().toUpperCase() === 'ADMIN' ? UserRole.ADMIN : UserRole.USER,
            lastLogin: getVal(['lastlogin', 'lastseen']) || ''
          };
        });
        setUsers(mappedUsers);
      }
    } catch (error) {
      console.error("Failed to sync with sheet:", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('subflow_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
    const savedTab = localStorage.getItem('subflow_active_tab');
    if (savedTab) setActiveTab(savedTab as TabType);
    else {
      if (user.role === UserRole.ADMIN) setActiveTab('dashboard');
      else setActiveTab('new');
    }
    }

    handleFetchFromSheet(true);
  }, [handleFetchFromSheet]);

  useEffect(() => {
    if (currentUser) localStorage.setItem('subflow_user', JSON.stringify(currentUser));
    else localStorage.removeItem('subflow_user');
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('subflow_active_tab', activeTab);
  }, [activeTab]);

  // Background auto-sync every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser) {
        handleFetchFromSheet(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser, handleFetchFromSheet]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    const savedTab = localStorage.getItem('subflow_active_tab');
    if (savedTab) setActiveTab(savedTab as TabType);
    else {
      if (user.role === UserRole.ADMIN) setActiveTab('dashboard');
      else setActiveTab('new');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const addSubscription = async (newSub: Omit<Subscription, 'id' | 'status' | 'createdAt' | 'subscriptionNo'>) => {
    // Find the highest existing SUB number and increment
    const maxNo = subscriptions.reduce((max, s) => {
      const match = s.subscriptionNo && typeof s.subscriptionNo === 'string' ? s.subscriptionNo.match(/SUB-(\d+)/) : null;
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const nextNo = (maxNo + 1).toString().padStart(4, '0');

    const createdAt = new Date().toISOString();
    let effectiveStartDate = createdAt;
    

    
    // Use the pre-calculated renewal details from the form/modal
    const renewalNo = renewalSubscription?.renewalNo || '';
    const renewalCount = renewalSubscription?.renewalCount || 0;

    const sub: Subscription = {
      ...newSub,
      id: Math.random().toString(36).substr(2, 9),
      subscriptionNo: `SUB-${nextNo}`,
      status: SubscriptionStatus.PENDING_APPROVAL,
      createdAt: createdAt,
      startDate: effectiveStartDate,
      endDate: calculateEndDate(effectiveStartDate, newSub.frequency),
      parentSubscriptionNo: renewalSubscription?.subscriptionNo,
      renewalNo: renewalNo,
      renewalCount: renewalCount,
    };

    // Optimistically add to UI
    setSubscriptions([sub, ...subscriptions]);
    lastActionTimeRef.current = Date.now();
    setActiveTab('my-subscriptions');

    const success = await addSubscriptionToSheet(sub);
    if (success) {
      console.log("Data sent to Google Sheets successfully.");

      // If this was a renewal, mark the original as EXPIRED
      if (renewalSubscription) {
        // Original sub keeps its EXISTING renewalNo and count when it expires
        // Actually, if it was renewed into something NEW, we keep the original's state
        updateStatus(renewalSubscription.id, SubscriptionStatus.EXPIRED, { 
          renewalNo: renewalSubscription.renewalNo, // Original's ID (e.g. REN-0001) if it had one
          renewalCount: renewalSubscription.renewalCount ? (renewalSubscription.renewalCount - 1) : 0 
        });
        await addToRenewalDB(sub);
      }

      setRenewalSubscription(null);
      
      // Auto-sync is now OFF
    }
  };

  const updateStatus = async (id: string, status: SubscriptionStatus, extraData: Partial<Subscription> = {}) => {
    // Use a functional setState to get the CURRENT (non-stale) subscriptions
    let updatedSub: Subscription | null = null;
    let oldSub: Subscription | null = null;

    setSubscriptions(subs => {
      const currentSub = subs.find(s => s.id === id);
      if (!currentSub) return subs;
      oldSub = currentSub;

      const updated: Subscription = { ...currentSub, status, ...extraData };
      if (status === SubscriptionStatus.PENDING_PAYMENT && !currentSub.approvedOn) {
        // Store full ISO timestamp so we can normalize it precisely for the sheet
        updated.approvedOn = new Date().toISOString();
        
        // Find the highest existing APP number and increment
        const maxAppNo = subs.reduce((max, s) => {
          const match = s.approvalNo && typeof s.approvalNo === 'string' ? s.approvalNo.match(/APP-(\d+)/) : null;
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
        updated.approvalNo = `APP-${(maxAppNo + 1).toString().padStart(4, '0')}`;
      }

      if (status === SubscriptionStatus.EXPIRED && !currentSub.renewalNo) {
        // Find the highest existing REN number and increment
        const maxRenNo = subs.reduce((max, s) => {
          const match = s.renewalNo && typeof s.renewalNo === 'string' ? s.renewalNo.match(/REN-(\d+)/) : null;
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
        updated.renewalNo = `REN-${(maxRenNo + 1).toString().padStart(4, '0')}`;
        // Ensure status date is captured
        updated.approvedOn = updated.approvedOn || new Date().toISOString();
      }
      updatedSub = updated;
      return subs.map(s => s.id === id ? updated : s);
    });

    lastActionTimeRef.current = Date.now();

    // Sync to Google Sheet
    await new Promise(resolve => setTimeout(resolve, 50));
    if (updatedSub && oldSub) {
      // 1. If moving from PAID to ACTIVE, first time activation -> Log to Billing Details Sheet
      if (status === SubscriptionStatus.ACTIVE && oldSub.status === SubscriptionStatus.PAID) {
        addToBillingSheet(updatedSub);
      }

      // 2. If specifically moving to a NEW audit step (from UI/AccountAuditView), logic depends on if we have a row index
      if ((extraData as any).auditRowIndex) {
        // UPDATE existing audit record
        await updateAuditLogSheetEntry(
          (extraData as any).auditRowIndex,
          (extraData as any).prevStage,
          (extraData as any).auditStatus,
          extraData.auditRemarks || "",
          extraData.step || "",
          (extraData as any).auditPlannedDate
        );
      } else if (extraData?.step && extraData.step !== oldSub.step) {
        // NEW audit record (first time entering audit)
        await addToAuditLogSheet(updatedSub);
      }
      
      // 3. Special case for audit remarks update (without step change)
      if (extraData?.auditRemarks && !extraData.step && !(extraData as any).auditRowIndex) {
        await addToAuditLogSheet(updatedSub);
      }

      const success = await updateSubscriptionInSheet(updatedSub);
      if (success) {
        console.log("Status update synced with Google Sheets:", (updatedSub as Subscription).subscriptionNo, "→", status);
        // Auto-sync is now OFF
      }
    }
  };

  const deleteSubscription = async (id: string) => {
    const subToDelete = subscriptions.find(s => s.id === id);
    if (!subToDelete) return;

    if (window.confirm(`Are you sure you want to delete "${subToDelete.subscriptionName}"?`)) {
      // Optimistically remove from UI
      setSubscriptions(subs => subs.filter(s => s.id !== id));

      const success = await deleteSubscriptionFromSheet(subToDelete.subscriptionNo);
      if (success) {
        console.log("Deletion synced with Google Sheets");
        // Auto-sync is now OFF
      }
    }
  };

  const addUser = async (newUser: Omit<User, 'id'>) => {
    const user: User = {
      ...newUser,
      id: Math.random().toString(36).substr(2, 9),
    };

    setUsers([user, ...users]);
    lastActionTimeRef.current = Date.now();

    const success = await addUserToSheet(user);
    if (success) {
      console.log("User added to Google Sheets successfully.");
    }
  };

  const deleteUser = async (username: string) => {
    const userToDelete = users.find(u => u.username === username);
    if (!userToDelete) return;

    if (window.confirm(`Are you sure you want to delete user "${userToDelete.name}"?`)) {
      setUsers(prev => prev.filter(u => u.username !== username));
      lastActionTimeRef.current = Date.now();

      const success = await deleteUserFromSheet(username);
      if (success) {
        console.log("User deletion synced with Google Sheets");
      }
    }
  };



  const counts = useMemo(() => ({
    renewals: subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE && isExpiringSoon(s.endDate)).length,
    pendingApproval: subscriptions.filter(s => s.status === SubscriptionStatus.PENDING_APPROVAL).length,
    payments: subscriptions.filter(s => s.status === SubscriptionStatus.PENDING_PAYMENT).length,
    postCopy: subscriptions.filter(s => s.status === SubscriptionStatus.PAID).length,
    active: subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE).length,
    audit: subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE && (s.step === 'Audit' || s.step === 'Re-Audit' || s.step === 'Tally Entry' || !s.step)).length,
    totalValue: subscriptions.reduce((acc, s) => acc + s.price, 0),
    renewalValue: subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE && isExpiringSoon(s.endDate)).reduce((acc, s) => acc + s.price, 0),
  }), [subscriptions]);

  const statusData = useMemo(() => {
    const data = Object.values(SubscriptionStatus).map(status => ({
      name: status.replace('_', ' ').toLowerCase(),
      value: subscriptions.filter(s => s.status === status).length,
    })).filter(d => d.value > 0);
    return data;
  }, [subscriptions]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  const [sortConfig, setSortConfig] = useState<{ key: keyof Subscription; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: keyof Subscription) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredSubscriptions = useMemo(() => {
    let filtered = [...subscriptions];
    if (activeTab === 'payments') {
      filtered = subscriptions.filter(s => s.status === SubscriptionStatus.PENDING_PAYMENT);
    } else if (activeTab === 'pending-approval') {
      filtered = subscriptions.filter(s => s.status === SubscriptionStatus.PENDING_APPROVAL);
    } else if (activeTab === 'renewals') {
      filtered = subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE && isExpiringSoon(s.endDate));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.subscriptionName.toLowerCase().includes(q) ||
        s.subscriberName.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        s.subscriptionNo.toLowerCase().includes(q)
      );
    }

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === undefined || bVal === undefined) return 0;

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default: Sort by Subscription No ascending (1, 2, 3...)
      filtered.sort((a, b) => {
        const aNo = String(a.subscriptionNo || "");
        const bNo = String(b.subscriptionNo || "");
        return aNo.localeCompare(bNo, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    return filtered;
  }, [subscriptions, activeTab, searchQuery, sortConfig]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} users={users} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-content-bg)] relative">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-indigo-100 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <LayoutGrid className="text-white w-5 h-5" />
          </div>
          <h1 className="text-sm font-bold text-indigo-900 leading-tight">Subscription <span className="text-indigo-500">Manager</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleFetchFromSheet(true)}
            disabled={isSyncing}
            className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors"
          >
            <RotateCcw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 text-zinc-600 hover:text-indigo-600 transition-colors"
          >
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[50]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarCollapsed ? 80 : 256,
          x: (window.innerWidth < 768 && !isMobileSidebarOpen) ? -256 : 0
        }}
        className={`fixed md:relative bg-white border-r border-indigo-100 flex flex-col shrink-0 z-[60] transition-all duration-300 ease-in-out h-full ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Toggle Button (Desktop Only) */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden md:flex absolute -right-3 top-20 bg-white border border-indigo-100 rounded-full p-1 shadow-md hover:text-indigo-600 transition-all z-10"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Close Button (Mobile Only) */}
        <button 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 text-zinc-400 hover:text-rose-500 transition-colors"
        >
          <XCircle className="w-6 h-6" />
        </button>

        <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <LayoutGrid className="text-white w-6 h-6" />
          </div>
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col overflow-hidden"
            >
              <h1 className="text-lg font-bold text-indigo-900 leading-tight whitespace-nowrap">Subscription</h1>
              <span className="text-sm font-semibold text-indigo-500 leading-tight whitespace-nowrap">Manager FMS</span>
            </motion.div>
          )}
          {!isSidebarCollapsed && (
            <button
              onClick={() => handleFetchFromSheet(true)}
              disabled={isSyncing}
              className="ml-auto p-1.5 text-zinc-400 hover:text-indigo-600 transition-colors hidden md:block"
              title="Sync Data"
            >
              <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {isSidebarCollapsed && (
          <div className="px-4 py-2 hidden md:flex justify-center border-b border-indigo-50 mb-2">
            <button
              onClick={() => handleFetchFromSheet(true)}
              disabled={isSyncing}
              className="p-1.5 text-zinc-400 hover:text-indigo-600 transition-colors"
              title="Sync Data"
            >
              <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        <nav className={`flex-1 ${isSidebarCollapsed ? 'px-2' : 'px-4'} space-y-1 overflow-y-auto py-4 custom-scrollbar`}>
          {currentUser.role === UserRole.ADMIN && (
            <SidebarItem
              icon={<Home className="w-5 h-5" />}
              label="Dashboard"
              active={activeTab === 'dashboard'}
              onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }}
              isCollapsed={isSidebarCollapsed}
            />
          )}

          <SidebarItem
            icon={<ClipboardList className="w-5 h-5" />}
            label="My Subscriptions"
            active={activeTab === 'my-subscriptions'}
            onClick={() => { setActiveTab('my-subscriptions'); setIsMobileSidebarOpen(false); }}
            isCollapsed={isSidebarCollapsed}
          />

          <SidebarItem
            icon={<PlusSquare className="w-5 h-5" />}
            label="New Subscription/Renewal's"
            active={activeTab === 'new'}
            onClick={() => {
              setRenewalSubscription(null);
              setActiveTab('new');
              setIsMobileSidebarOpen(false);
            }}
            isCollapsed={isSidebarCollapsed}
          />

          <SidebarItem
            icon={<CheckSquare className="w-5 h-5" />}
            label="Pending Approval"
            count={currentUser.role === UserRole.ADMIN ? counts.pendingApproval : undefined}
            active={activeTab === 'pending-approval'}
            onClick={() => { setActiveTab('pending-approval'); setIsMobileSidebarOpen(false); }}
            isCollapsed={isSidebarCollapsed}
            hidden={currentUser.role !== UserRole.ADMIN}
          />
          <SidebarItem
            icon={<CreditCard className="w-5 h-5" />}
            label="Payments"
            count={counts.payments}
            active={activeTab === 'payments'}
            onClick={() => { setActiveTab('payments'); setIsMobileSidebarOpen(false); }}
            isCollapsed={isSidebarCollapsed}
          />
          <SidebarItem
            icon={<FileText className="w-5 h-5" />}
            label="Billing Details"
            count={counts.postCopy}
            active={activeTab === 'billing-details'}
            onClick={() => { setActiveTab('billing-details'); setIsMobileSidebarOpen(false); }}
            isCollapsed={isSidebarCollapsed}
          />
          {currentUser.role === UserRole.ADMIN && (
            <SidebarItem
              icon={<ShieldCheck className="w-5 h-5" />}
              label="Account Audit"
              count={counts.audit}
              active={activeTab === 'account-audit'}
              onClick={() => { setActiveTab('account-audit'); setIsMobileSidebarOpen(false); }}
              isCollapsed={isSidebarCollapsed}
            />
          )}

          <SidebarItem
            icon={<RotateCcw className="w-5 h-5" />}
            label="Renewals"
            count={counts.renewals}
            active={activeTab === 'renewals'}
            onClick={() => {
              setRenewalSubscription(null);
              setActiveTab('renewals');
              setIsMobileSidebarOpen(false);
            }}
            isCollapsed={isSidebarCollapsed}
          />

          {currentUser.role === UserRole.ADMIN && (
            <SidebarItem
              icon={<UserManagementIcon className="w-5 h-5" />}
              label="User Management"
              active={activeTab === 'user-management'}
              onClick={() => { setActiveTab('user-management'); setIsMobileSidebarOpen(false); }}
              isCollapsed={isSidebarCollapsed}
            />
          )}
        </nav>

        <div className={`p-4 border-t border-indigo-50 space-y-4 ${isSidebarCollapsed ? 'items-center' : ''}`}>
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-2'}`}>
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 shrink-0">
              <span className="text-indigo-600 font-bold text-lg">{currentUser.name[0]}</span>
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs text-zinc-400 whitespace-nowrap">Name: <span className="text-zinc-700 font-semibold">{currentUser.name}</span></span>
                <span className="text-xs text-zinc-400 whitespace-nowrap">User: <span className="text-zinc-700 font-semibold">{currentUser.username}</span></span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-indigo-100 rounded-xl text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all font-medium text-sm shadow-sm ${isSidebarCollapsed ? 'px-0' : ''}`}
            title={isSidebarCollapsed ? 'Logout' : ''}
          >
            <LogOut className="w-4 h-4" /> {!isSidebarCollapsed && 'Logout'}
          </button>
          {!isSidebarCollapsed && (
            <div className="text-center">
              <p className="text-[10px] text-zinc-400">Powered by - <span className="text-indigo-400 font-medium">Botivate</span></p>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="text-center">
              <span className="text-[8px] text-indigo-400 font-black">B</span>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar mt-16 md:mt-0">
        {/* Renewal Reminder Banner */}
        {counts.renewals > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="text-amber-600 w-6 h-6" />
              </div>
              <div>
                <h4 className="text-amber-900 font-bold">Renewal Reminder</h4>
                <p className="text-amber-700 text-sm">You have {counts.renewals} subscriptions expiring within 5 days.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('renewals')}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-amber-100"
            >
              View Renewals
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && currentUser.role === UserRole.ADMIN && (
            <DashboardView
              subscriptions={subscriptions}
              counts={counts}
              statusData={statusData}
              COLORS={COLORS}
            />
          )}

          {activeTab === 'new' && (
            <motion.div
              key="new"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div className="card p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
                      <PlusSquare className="text-indigo-600 w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">New Subscription</h2>
                      <p className="text-zinc-500 text-sm font-medium">Add a new service to your tracking list</p>
                    </div>
                  </div>
                </div>
                <SubscriptionForm
                  key={renewalSubscription?.id || 'new-sub'}
                  onSubmit={addSubscription}
                  personNames={mastersData?.persons || [...new Set(subscriptions.map(s => s.subscriberName).filter(Boolean))]}
                  companyNames={mastersData?.companies || [...new Set(subscriptions.map(s => s.companyName).filter(Boolean))]}
                  mastersData={mastersData}
                  initialData={renewalSubscription || {}}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'my-subscriptions' && (
            <MySubscriptionsView
              subscriptions={subscriptions}
              filteredSubscriptions={filteredSubscriptions}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              handleSort={handleSort}
              deleteSubscription={deleteSubscription}
            />
          )}

          {activeTab === 'pending-approval' && currentUser.role === UserRole.ADMIN && (
            <PendingApprovalView
              subscriptions={subscriptions}
              updateStatus={updateStatus}
            />
          )}

          {activeTab === 'renewals' && (
            <RenewalsView
              subscriptions={subscriptions}
              updateStatus={updateStatus}
              userRole={currentUser.role}
        onNavigateToNew={(sub) => {
          if (sub) {
            let subWithRen = { ...sub };

            // Backward-compatibility fix for vendor name mapping
            if (!subWithRen.subscriptionType && subWithRen.subscriptionName) {
              subWithRen = {
                ...subWithRen,
                subscriptionType: subWithRen.subscriptionName,
                subscriptionName: '',
              };
            }

            setRenewalSubscription(subWithRen);
          }
          setActiveTab('new');
        }}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              subscriptions={subscriptions}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              updateStatus={updateStatus}
            />
          )}

          {activeTab === 'billing-details' && (
            <BillingDetailsView
              subscriptions={subscriptions}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              updateStatus={updateStatus}
            />
          )}

          {activeTab === 'account-audit' && currentUser.role === UserRole.ADMIN && (
            <AccountAuditView 
              subscriptions={subscriptions} 
              auditLogData={auditLogData}
              updateStatus={updateStatus}
              isSyncing={isSyncing}
              onRefresh={() => handleFetchFromSheet(true)}
            />
          )}


          {activeTab === 'user-management' && currentUser.role === UserRole.ADMIN && (
            <UserManagementView users={users} onAddUser={addUser} onDeleteUser={deleteUser} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
