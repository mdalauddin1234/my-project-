import React from 'react';
import { ClipboardList, Search, ArrowUpDown, Trash2, Image as ImageIcon, RotateCcw, X, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subscription } from '../types';
import { StatusBadge } from './StatusBadge';

interface MySubscriptionsViewProps {
  subscriptions: Subscription[];
  filteredSubscriptions: Subscription[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSort: (key: keyof Subscription) => void;
  deleteSubscription: (id: string) => void;
}

export const MySubscriptionsView: React.FC<MySubscriptionsViewProps> = ({
  subscriptions,
  filteredSubscriptions,
  searchQuery,
  setSearchQuery,
  handleSort,
  deleteSubscription
}) => {
  const [viewPhoto, setViewPhoto] = React.useState<string | null>(null);

  return (
    <motion.div 
      key="my-subscriptions"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
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
              className="relative max-w-5xl w-full h-full flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={viewPhoto} 
                alt="Receipt Full View" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl shadow-black/50" 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Standardized Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">My Subscriptions</h2>
            <p className="text-zinc-500 text-sm font-medium">Manage and track all your subscription services</p>
          </div>
        </div>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('force-sync'))}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          Sync Now
        </button>
      </div>

      {/* Search and Table Container */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-indigo-50 bg-zinc-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-indigo-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-50/80">
                <th className="table-header text-left whitespace-nowrap">Timestamp</th>
                <th className="table-header text-left whitespace-nowrap">Subscription No</th>
                <th className="table-header text-left whitespace-nowrap">Renewal ID</th>
                <th className="table-header text-left whitespace-nowrap">Renewal No</th>
                <th className="table-header text-left whitespace-nowrap">Name of the Person</th>
                <th className="table-header text-left whitespace-nowrap">Company name</th>
                <th className="table-header text-left whitespace-nowrap">Category of subscription</th>
                <th className="table-header text-left whitespace-nowrap">Name of Subscription</th>
                <th className="table-header text-left whitespace-nowrap">Vendor Name</th>
                <th className="table-header text-center whitespace-nowrap">Frequency</th>
                <th className="table-header cursor-pointer group whitespace-nowrap" onClick={() => handleSort('price')}>
                  <div className="flex items-center gap-1 justify-center">
                    Price
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="table-header cursor-pointer group whitespace-nowrap" onClick={() => handleSort('startDate')}>
                  <div className="flex items-center gap-1 justify-center">
                    Planned Date
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="table-header cursor-pointer group whitespace-nowrap" onClick={() => handleSort('endDate')}>
                  <div className="flex items-center gap-1 justify-center">
                    End Date
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="table-header text-center whitespace-nowrap">Status</th>
                <th className="table-header whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {filteredSubscriptions.map((sub, idx) => (
                <tr key={sub.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'} hover:bg-indigo-50/50 transition-colors group`}>
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
                  <td className="table-cell font-mono text-xs text-indigo-600 font-bold">{sub.subscriptionNo}</td>
                  <td className="table-cell font-mono text-xs text-zinc-400 font-medium">{sub.renewalNo || '-'}</td>
                  <td className="table-cell font-mono text-xs text-zinc-400 font-medium">{sub.renewalCount || '-'}</td>
                  <td className="table-cell text-zinc-600">{sub.subscriberName}</td>
                  <td className="table-cell font-medium text-zinc-700">{sub.companyName}</td>
                  <td className="table-cell text-zinc-600 text-sm">{sub.category}</td>
                  <td className="table-cell text-zinc-600 text-sm font-medium">{sub.subscriptionName || '-'}</td>
                  <td className="table-cell">
                    <div className="flex flex-col">
                      <span className="text-indigo-600 font-bold">
                        {sub.subscriptionType || '-'}
                      </span>
                      <span className="text-[10px] text-zinc-400 line-clamp-1 max-w-[200px]" title={sub.details}>
                        {sub.details}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell text-zinc-600 text-center font-medium">{sub.frequency}</td>
                  <td className="table-cell font-bold text-emerald-600 text-center">₹{sub.price.toLocaleString()}</td>
                  <td className="table-cell text-zinc-500 text-[10px] text-center">
                    {sub.startDate && !isNaN(new Date(sub.startDate).getTime()) ? new Date(sub.startDate).toLocaleString('en-GB', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    }) : '-'}
                  </td>
                  <td className="table-cell text-zinc-500 text-[10px] text-center">
                    {sub.endDate && !isNaN(new Date(sub.endDate).getTime()) ? new Date(sub.endDate).toLocaleString('en-GB', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    }) : '-'}
                  </td>
                  <td className="table-cell text-center">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="table-cell text-right">
                    <button 
                      onClick={() => deleteSubscription(sub.id)}
                      className="p-2 text-zinc-300 hover:text-rose-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-indigo-50">
          {filteredSubscriptions.map((sub) => (
            <div key={sub.id} className="p-4 space-y-3 bg-white hover:bg-indigo-50/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-600 font-mono">{sub.subscriptionNo}</span>
                <StatusBadge status={sub.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Subscriber</label>
                  <p className="text-sm font-bold text-zinc-800">{sub.subscriberName}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Company</label>
                  <p className="text-sm font-bold text-zinc-800">{sub.companyName}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Subscription</label>
                <p className="text-sm font-bold text-indigo-600">{sub.subscriptionName || '-'}</p>
                <p className="text-[10px] text-zinc-500 font-medium">{sub.subscriptionType || '-'}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-indigo-50/50">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Price</label>
                  <span className="text-lg font-black text-emerald-600">₹{sub.price.toLocaleString()}</span>
                </div>
                <button 
                  onClick={() => deleteSubscription(sub.id)}
                  className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="text-[10px] text-zinc-400 font-medium space-y-1">
                <div>Start: {sub.startDate && !isNaN(new Date(sub.startDate).getTime()) ? new Date(sub.startDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</div>
                <div>End: {sub.endDate && !isNaN(new Date(sub.endDate).getTime()) ? new Date(sub.endDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</div>
              </div>
            </div>
          ))}
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="py-12 text-center text-zinc-400 text-sm bg-white">
            No subscriptions found
          </div>
        )}
      </div>
    </motion.div>
  );
};
