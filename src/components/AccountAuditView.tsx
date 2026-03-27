import React from 'react';
import { motion } from 'motion/react';
import { 
  Columns, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Clock, 
  FileText, 
  Edit3,
  X,
  XCircle
} from 'lucide-react';
import { Subscription, SubscriptionStatus } from '../types';
import { AnimatePresence } from 'motion/react';

interface AccountAuditViewProps {
  subscriptions: Subscription[];
  auditLogData?: any[];
  updateStatus: (id: string, status: SubscriptionStatus, extraData?: any) => void;
  isSyncing: boolean;
  onRefresh?: () => void;
}

type AuditStage = 'All Stages' | 'Audit' | 'Rectify' | 'Re-Audit' | 'Tally Entry' | 'Bill Received';

export const AccountAuditView: React.FC<AccountAuditViewProps> = ({ subscriptions, auditLogData = [], updateStatus, isSyncing, onRefresh }) => {
  const [activeStage, setActiveStage] = React.useState<AuditStage>('Audit');
  const [selectedSub, setSelectedSub] = React.useState<Subscription | null>(null);
  const [reviewAction, setReviewAction] = React.useState<'approve' | 'reject' | ''>('');
  const [reviewNote, setReviewNote] = React.useState('');
  const [showColumnToggle, setShowColumnToggle] = React.useState(false);
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({
    actions: true,
    stage: true,
    timestamp: true,
    subscriptionNo: true,
    name: true,
    frequency: true,
    price: true,
    endDate: true,
    billImage: true,
    plannedDate: true,
    status: true,
    remarks: true
  });

  const activeSubscriptions = subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE);

  const getNormalizedStep = (s: any) => {
    const raw = (s.stage || s.step || s.ds || '').toString().trim().toLowerCase();
    if (!raw || raw === '-' || raw === '0' || raw === 'pending' || raw === 'audit') return 'audit';
    return raw;
  };

  const mergedData = React.useMemo(() => {
    // Create a map for fast lookup of active local subscriptions
    const subMap = new Map<string, Subscription>();
    activeSubscriptions.forEach(sub => {
      if (sub.subscriptionNo) subMap.set(sub.subscriptionNo.toLowerCase(), sub);
    });

    // 1. Process all entries from the audit sheet and deduplicate by sub number
    const auditMap = new Map<string, any>();
    auditLogData.forEach(item => {
      const sNo = (item.subscriptionno || item.subscriptionNo || item.subno || '').toString().toLowerCase();
      if (!sNo) return;
      
      const localSub = subMap.get(sNo);
      // Source of truth: Local App Step > Sheet Stage
      const currentStage = (localSub?.step || item.stage || item.step || item.ds || 'Audit').toString().trim();
      
      const record = {
        ...item,
        subscriptionNo: item.subscriptionno || item.subscriptionNo || item.subno,
        stage: currentStage
      };

      // Deduplicate: Keep the latest record for each subscription number
      const existing = auditMap.get(sNo);
      if (!existing || new Date(record.timestamp || 0) > new Date(existing.timestamp || 0)) {
        auditMap.set(sNo, record);
      }
    });

    // 2. Filter standardized records to ONLY those that have been "Submitted" 
    // We check for EXPLICIT columns in the audit data itself. 
    // This avoids showing every ACTIVE subscription by mistake.
    const standardizedAuditData = Array.from(auditMap.values()).filter(item => {
      // Check sheet columns specifically - these must have data for it to be a real audit entry
      const hasSheetImage = item.billimage && item.billimage !== '-' && item.billimage !== '';
      const hasStatus = (item.status1 && item.status1 !== '-' && item.status1 !== '') || 
                        (item.status2 && item.status2 !== '-' && item.status2 !== '');
      
      return hasSheetImage || hasStatus; 
    });

    const data = [...standardizedAuditData];
    
    // 3. Add subscriptions that are in ACTIVE state but don't have an audit record in the sheet yet
    // ONLY if they have an explicit audit step assigned (meaning they were just submitted in-app)
    activeSubscriptions.forEach(sub => {
      const subNoLower = (sub.subscriptionNo || '').toLowerCase();
      const existsInProcessed = standardizedAuditData.some(item => 
        (item.subscriptionNo || '').toString().toLowerCase() === subNoLower
      );
      
      // Prevent showing "ghost" active subscriptions that haven't been through the billing submit
      if (!existsInProcessed && sub.step && sub.step !== '' && sub.step !== '-' && sub.step.toLowerCase() !== 'active') {
        data.push({
          ...sub,
          stage: sub.step
        });
      }
    });
    
    return data;
  }, [auditLogData, activeSubscriptions]);

  const stages: { label: AuditStage; count: number; icon: React.ReactNode }[] = [
    { label: 'All Stages', count: mergedData.length, icon: null },
    { label: 'Audit', count: mergedData.filter(s => {
        const step = getNormalizedStep(s);
        return step === 'audit' || step === '' || step === '-' || step === '0' || step === 'pending' || !step;
      }).length, icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: 'Rectify', count: mergedData.filter(s => getNormalizedStep(s) === 'rectify').length, icon: <AlertCircle className="w-4 h-4" /> },
    { label: 'Re-Audit', count: mergedData.filter(s => getNormalizedStep(s) === 're-audit').length, icon: <RotateCcw className="w-4 h-4" /> },
    { label: 'Tally Entry', count: mergedData.filter(s => getNormalizedStep(s) === 'tally entry').length, icon: <Clock className="w-4 h-4" /> },
    { label: 'Bill Received', count: mergedData.filter(s => getNormalizedStep(s) === 'bill received').length, icon: <FileText className="w-4 h-4" /> },
  ];

  const filteredData = React.useMemo(() => {
    const dataSource = mergedData;
    if (activeStage === 'All Stages') return dataSource;
    if (activeStage === 'Audit') {
      return dataSource.filter(s => getNormalizedStep(s) === 'audit');
    }
    const currentStageLower = activeStage.toLowerCase();
    return dataSource.filter(s => getNormalizedStep(s) === currentStageLower);
  }, [mergedData, activeStage]);

  const handleAuditSubmit = async () => {
    if (!selectedSub || !reviewAction) return;

    const rawStep = (selectedSub.step || 'Audit').toString().trim();
    // Standardize to Proper Case for logic
    let currentStep = 'Audit';
    if (rawStep.toLowerCase() === 'rectify') currentStep = 'Rectify';
    else if (rawStep.toLowerCase() === 're-audit') currentStep = 'Re-Audit';
    else if (rawStep.toLowerCase() === 'tally entry') currentStep = 'Tally Entry';
    else if (rawStep.toLowerCase() === 'bill received') currentStep = 'Bill Received';

    let nextStep = currentStep;
    const isDone = reviewAction === 'approve';

    if (currentStep === 'Audit') {
      nextStep = isDone ? 'Tally Entry' : 'Rectify';
    } else if (currentStep === 'Rectify') {
      nextStep = isDone ? 'Re-Audit' : 'Rectify';
    } else if (currentStep === 'Re-Audit') {
      nextStep = isDone ? 'Bill Received' : 'Re-Audit';
    } else if (currentStep === 'Tally Entry') {
      nextStep = isDone ? 'Bill Received' : 'Tally Entry';
    } else if (currentStep === 'Bill Received') {
      // If already bill received and done, stay there
      nextStep = 'Bill Received';
    }

    // Capture the original row index from the auditLogData if it matches this sub
    const auditRecord = auditLogData.find(item => item.subscriptionno === selectedSub.subscriptionNo);
    const auditRowIndex = auditRecord?.originalRowIndex;
    
    // Get planned date for delay calculation
    let plannedDate = "";
    if (currentStep === 'Audit') plannedDate = auditRecord?.planned1;
    else if (currentStep === 'Rectify') plannedDate = auditRecord?.planned2;
    else if (currentStep === 'Re-Audit') plannedDate = auditRecord?.planned3;
    else if (currentStep === 'Tally Entry') plannedDate = auditRecord?.planned4;

    await updateStatus(selectedSub.id, SubscriptionStatus.ACTIVE, {
      id: selectedSub.id, 
      step: nextStep,
      auditRemarks: reviewNote,
      // We pass these as extra fields that updateStatus will forward/handle
      auditRowIndex: auditRowIndex,
      prevStage: currentStep,
      auditStatus: isDone ? 'Done' : 'Not Done',
      auditPlannedDate: plannedDate
    } as any);

    setSelectedSub(null);
    setReviewAction('');
    setReviewNote('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Account Audit</h2>
            <p className="text-zinc-500 text-sm font-medium">Track all stages of account processing</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowColumnToggle(!showColumnToggle)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold transition-all ${
                showColumnToggle ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-zinc-50 border-zinc-100 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Columns className="w-4 h-4" />
              Columns
            </button>
            <button 
              onClick={onRefresh}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-lg text-sm font-bold text-zinc-600 hover:bg-zinc-100 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Column Toggle Panel */}
        <AnimatePresence>
          {showColumnToggle && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 pb-6 overflow-hidden"
            >
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Toggle Table Columns</h4>
                  <button onClick={() => setShowColumnToggle(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(columnVisibility).map(col => (
                    <button
                      key={col}
                      onClick={() => setColumnVisibility(prev => ({ ...prev, [col]: !prev[col] }))}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border transition-all ${
                        columnVisibility[col]
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                          : 'bg-white border-zinc-100 text-zinc-400 opacity-60'
                      }`}
                    >
                      {col === 'billImage' ? 'Bill Image' : 
                       col === 'plannedDate' ? 'Planned Date' : 
                       col.charAt(0).toUpperCase() + col.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Stages */}
        <div className="px-6 pb-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {stages.map((stage) => (
            <button
              key={stage.label}
              onClick={() => setActiveStage(stage.label)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border-2 ${
                activeStage === stage.label 
                  ? 'bg-amber-50/30 border-amber-100 text-zinc-800 ring-2 ring-amber-400/20' 
                  : 'bg-white border-transparent text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {stage.icon}
                {stage.label}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeStage === stage.label ? 'bg-amber-200/50 text-amber-700' : 'bg-zinc-100 text-zinc-500'
              }`}>
                {stage.count}
              </span>
            </button>
          ))}
        </div>

        {/* Current Stage Info */}
        <div className="px-6 py-4 bg-zinc-50/30 border-t border-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100/50 rounded-xl flex items-center justify-center border border-amber-200/30">
              <CheckCircle2 className="text-amber-600 w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-800">{activeStage}</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Initial audit verification from live sheet</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-zinc-400">Showing {filteredData.length} records</span>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white">
                {columnVisibility.actions && <th className="table-header border-none text-zinc-400 font-bold py-6 px-6">ACTIONS</th>}
                {columnVisibility.stage && <th className="table-header border-none text-zinc-400 font-bold py-6 px-6 text-center">STAGE</th>}
                {columnVisibility.timestamp && <th className="table-header border-none text-zinc-400 font-bold py-6 px-6">Timestamp</th>}
                {columnVisibility.subscriptionNo && <th className="table-header border-none text-zinc-400 font-bold py-6 px-6 whitespace-nowrap">Subscription No</th>}
                {columnVisibility.name && <th className="table-header border-none text-zinc-400 font-bold py-6 px-6 whitespace-nowrap">Name of Subscription</th>}
                {columnVisibility.frequency && <th className="table-header border-none text-zinc-400 font-bold py-6 px-6 text-center">Frequency</th>}
                {columnVisibility.price && <th className="table-header border-none text-zinc-400 font-bold py-6 px-6 text-center">Price</th>}
                {columnVisibility.endDate && <th className="table-header border-none text-zinc-400 font-bold py-6 px-6 text-center">End Date</th>}
                {columnVisibility.billImage && <th className="table-header border-none text-zinc-400 font-bold py-6 px-6 text-center whitespace-nowrap">Bill Image</th>}
                {columnVisibility.plannedDate && <th className="table-header border-none text-zinc-400 font-bold py-6 px-6 text-center">Planned Date</th>}
                {columnVisibility.status && <th className="table-header border-none text-zinc-400 font-bold py-6 px-6 text-center">Status</th>}
                {columnVisibility.remarks && <th className="table-header border-none text-zinc-400 font-bold py-6 px-6">Remarks</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-20 text-center text-zinc-300 italic">No records found for {activeStage}</td>
                </tr>
              ) : (
                filteredData.map((item, idx) => {
                  const itemSubNo = item.subscriptionNo || item.subscriptionno;
                  const sub = subscriptions.find(s => s.subscriptionNo === itemSubNo) || item;
                  
                  const getDisplayStage = () => {
                    const s = getNormalizedStep(item);
                    if (s === 'audit') return 'Audit';
                    // Re-capitalize for display
                    return s.charAt(0).toUpperCase() + s.slice(1);
                  };

                  const step = getNormalizedStep(item);

                  const getDisplayPlannedDate = () => {
                    // Try to match the planned date for the specific stage first
                    if (step === 'audit' || !step || step === '-' || step === '0') return item.planned1 || item.planneddate || sub.startDate || sub.planned1;
                    if (step === 'rectify') return item.planned2 || item.planneddate || sub.startDate || sub.planned2;
                    if (step === 're-audit') return item.planned3 || item.planneddate || sub.startDate || sub.planned3;
                    if (step === 'tally entry') return item.planned4 || item.planneddate || sub.startDate;
                    if (step === 'bill received') return item.planned5 || item.planneddate || sub.startDate;
                    
                    return item.planneddate || item.planned1 || sub.startDate || '-';
                  };

                  const getDisplayActualDate = () => {
                    if (step === 'audit' || !step) return item.actual1;
                    if (step === 'rectify') return item.actual2;
                    if (step === 're-audit') return item.actual3;
                    if (step === 'tally entry') return item.actual4;
                    if (step === 'bill received') return item.actual5;
                    return '-';
                  };

                  const getDisplayStatusAndRemarks = () => {
                    if (step === 'audit' || !step) return { status: item.status1, rem: item.remarks1 };
                    if (step === 'rectify') return { status: item.status2, rem: item.remarks2 };
                    if (step === 're-audit') return { status: item.status3, rem: item.remarks3 };
                    if (step === 'tally entry') return { status: item.status4, rem: item.remarks4 };
                    if (step === 'bill received') return { status: item.status5, rem: item.remarks5 };
                    return { status: '-', rem: '-' };
                  };

                  const details = getDisplayStatusAndRemarks();

                  const displayItem = {
                    billStatus: item.billstatus || '-',
                    stage: getDisplayStage(),
                    timestamp: item.timestamp || (sub.createdAt),
                    subscriptionNo: item.subscriptionno || sub.subscriptionNo,
                    renewalId: item.renewalid || sub.renewalNo || '-',
                    renewalNo: item.renewalno || sub.renewalCount || '-',
                    name: item.nameofsubscription || sub.subscriptionName,
                    freq: item.frequency || sub.frequency,
                    price: item.price || sub.price,
                    startDate: item.startdate || sub.startDate || '-',
                    endDate: item.enddate || sub.endDate || '-',
                    plannedDate: getDisplayPlannedDate(),
                    actualDate: getDisplayActualDate() || '-',
                    auditStatus: details.status || '-',
                    remarks: details.rem || '-',
                    billImage: item.billimage || '-'
                  };

                  return (
                    <tr key={item.id || item.subscriptionno || idx} className="hover:bg-indigo-50/10 transition-colors group">
                      {columnVisibility.actions && (
                        <td className="py-6 px-6 align-middle">
                          <button 
                            onClick={() => {
                              if (sub.id) {
                                setSelectedSub(sub);
                                setReviewAction('');
                                setReviewNote('');
                              }
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                            disabled={!sub.id}
                          >
                            <Edit3 className="w-4 h-4" />
                            Add Entry
                          </button>
                        </td>
                      )}
                      
                      {columnVisibility.stage && (
                        <td className="py-6 px-6 align-middle text-center">
                          <span className="px-4 py-1 bg-zinc-50 text-zinc-600 rounded-full text-[10px] font-black uppercase border border-zinc-100 inline-flex items-center gap-1">
                            {displayItem.stage}
                          </span>
                        </td>
                      )}
                      
                      {columnVisibility.timestamp && (
                        <td className="py-6 px-6 align-middle">
                          <span className="text-sm font-bold text-zinc-600">
                            {displayItem.timestamp ? new Date(displayItem.timestamp).toLocaleString('en-GB', { 
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit', second: '2-digit'
                            }).replace(',', '') : '-'}
                          </span>
                        </td>
                      )}
                      
                      {columnVisibility.subscriptionNo && (
                        <td className="py-6 px-6 align-middle">
                          <span className="text-sm font-black text-indigo-600 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-md">
                            {displayItem.subscriptionNo}
                          </span>
                        </td>
                      )}
                      
                      {columnVisibility.name && (
                        <td className="py-6 px-6 align-middle">
                          <span className="text-sm font-black text-zinc-900">{displayItem.name}</span>
                        </td>
                      )}
                      
                      {columnVisibility.frequency && (
                        <td className="py-6 px-6 align-middle text-center">
                          <span className="text-sm font-bold text-zinc-600">{displayItem.freq}</span>
                        </td>
                      )}
                      
                      {columnVisibility.price && (
                        <td className="py-6 px-6 align-middle text-center">
                          <span className="text-sm font-black text-emerald-600">₹{Number(displayItem.price).toLocaleString()}</span>
                        </td>
                      )}
                      
                      {columnVisibility.endDate && (
                        <td className="py-6 px-6 align-middle text-center">
                          <span className="text-[10px] font-bold text-zinc-500">
                            {displayItem.endDate && !isNaN(new Date(displayItem.endDate).getTime()) ? new Date(displayItem.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </span>
                        </td>
                      )}
                      
                      {columnVisibility.billImage && (
                        <td className="py-6 px-6 align-middle text-center">
                          {displayItem.billImage && displayItem.billImage !== '-' ? (
                            <div className="flex flex-col items-center gap-2">
                              {displayItem.billImage.startsWith('data:image') || !displayItem.billImage.startsWith('http') ? (
                                <div className="w-10 h-10 mx-auto rounded-lg border border-zinc-100 overflow-hidden relative shadow-sm flex items-center justify-center bg-white">
                                  <img src={displayItem.billImage} alt="Bill" className="w-full h-full object-cover" />
                                </div>
                              ) : null}
                              <a 
                                href={displayItem.billImage} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 underline uppercase tracking-widest whitespace-nowrap"
                              >
                                Open Bill
                              </a>
                            </div>
                          ) : (
                            <span className="text-zinc-300 text-[10px] font-bold">No Image</span>
                          )}
                        </td>
                      )}
                      
                      {columnVisibility.plannedDate && (
                        <td className="py-6 px-6 align-middle text-center">
                          <span className="text-[10px] font-bold text-zinc-500">
                            {displayItem.plannedDate && !isNaN(new Date(displayItem.plannedDate).getTime()) ? new Date(displayItem.plannedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </span>
                        </td>
                      )}
                      
                      {columnVisibility.status && (
                        <td className="py-6 px-6 align-middle text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            displayItem.auditStatus.toLowerCase() === 'done' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {displayItem.auditStatus}
                          </span>
                        </td>
                      )}
                      
                      {columnVisibility.remarks && (
                        <td className="py-6 px-6 align-middle">
                          <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[120px] block" title={displayItem.remarks}>
                            {displayItem.remarks}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Custom Progress Bar like in screenshot */}
        <div className="px-6 py-4 bg-zinc-50/50 flex items-center gap-4">
          <div className="h-2 flex-1 bg-zinc-200 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-400 w-1/3 rounded-full cursor-pointer" />
          </div>
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative border border-zinc-100"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white pt-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-zinc-900 tracking-tight">Add Entry - {selectedSub.subscriptionNo}</h3>
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase border border-amber-200/50 flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Audit
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedSub(null)} 
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
                {/* Information Box (Replacing Lift Details) */}
                <div className="bg-zinc-50/50 rounded-xl p-6 border border-zinc-100 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 opacity-20 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Company Name</label>
                      <p className="text-sm font-bold text-zinc-800">{selectedSub.companyName}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Name of the Person</label>
                      <p className="text-sm font-bold text-zinc-800">{selectedSub.subscriberName}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Category of Subscription</label>
                      <p className="text-sm font-bold text-zinc-800">{selectedSub.category || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Name of Subscription</label>
                      <p className="text-sm font-bold text-indigo-600">{selectedSub.subscriptionName || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Vendor Name</label>
                      <p className="text-sm font-bold text-indigo-900">{selectedSub.subscriptionType || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Price</label>
                      <p className="text-sm font-black text-emerald-600">₹{selectedSub.price.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Frequency</label>
                      <p className="text-sm font-bold text-zinc-700">{selectedSub.frequency}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Requested On</label>
                      <p className="text-sm font-bold text-zinc-700">
                        {new Date(selectedSub.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Renewal ID</label>
                      <p className="text-sm font-bold text-zinc-700">{selectedSub.renewalNo || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Renewal Number</label>
                      <p className="text-sm font-bold text-zinc-700">{selectedSub.renewalCount || '-'}</p>
                    </div>
                    <div className="col-span-2 space-y-1 border-t border-zinc-100 pt-3 mt-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Remark of Purpose</label>
                      <p className="text-sm font-medium text-zinc-600 italic">"{selectedSub.details || 'No details provided'}"</p>
                    </div>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-700 uppercase tracking-wider block ml-1">Status</label>
                  <select 
                    value={reviewAction === 'approve' ? 'Done' : reviewAction === 'reject' ? 'Not Done' : ''}
                    onChange={(e) => {
                      if (e.target.value === 'Done') setReviewAction('approve');
                      else if (e.target.value === 'Not Done') setReviewAction('reject');
                      else setReviewAction('');
                    }}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all cursor-pointer shadow-sm"
                  >
                    <option value="">Select Status</option>
                    <option value="Not Done">Not Done</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                {/* Remarks Textarea */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-700 uppercase tracking-wider block ml-1">Remarks</label>
                  <textarea 
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={4}
                    placeholder="Enter your remarks..."
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all resize-none placeholder:text-zinc-300 font-medium shadow-sm"
                  />
                </div>

                {/* Modal Footer Buttons */}
                <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => setSelectedSub(null)}
                    className="px-8 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-black text-sm hover:bg-zinc-200 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!reviewAction || isSyncing}
                    onClick={handleAuditSubmit}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 disabled:opacity-30 transition-all active:scale-95 shadow-lg shadow-emerald-900/10"
                  >
                    {isSyncing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    Submit Entry
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
