import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Frequency, Subscription } from '../types';

interface SubscriptionFormProps {
  onSubmit: (data: any) => void;
  personNames?: string[];
  companyNames?: string[];
  mastersData?: { companies: string[], persons: string[], categories: Record<string, string[]> } | null;
  initialData?: Partial<Subscription>;
}

const DEFAULT_PERSONS = ['Admin', 'Management', 'IT Department', 'Marketing', 'Sales', 'HR', 'Finance'];
const DEFAULT_COMPANIES = ['Amazon', 'Google', 'Microsoft', 'Adobe', 'Slack', 'Zoom', 'Canva', 'DigitalOcean', 'Cloudflare', 'Other'];

const DEFAULT_CATEGORIES = [
  'Membership & Association',
  'Insurance',
  'IT / Software / Digital Services',
  'Domain / Email ID Management',
  'Government / Compliance / Licenses',
  'Tax Payments',
  'Vehicle & Transport Services',
  'Maintenance / AMC',
  'Professional / Consultancy Services',
  'Banking / Financial Services'
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = Array.from({ length: 7 }, (_, i) => 2024 + i);

export const SubscriptionForm: React.FC<SubscriptionFormProps> = ({ onSubmit, personNames = [], companyNames = [], mastersData, initialData }) => {
  // Dynamic persons, categories and companies
  const persons = mastersData?.persons?.length ? mastersData.persons : (personNames.length > 0 ? personNames : DEFAULT_PERSONS);
  const categories = mastersData ? Object.keys(mastersData.categories) : DEFAULT_CATEGORIES;
  const companies = (mastersData && mastersData.companies?.length) ? mastersData.companies : (companyNames.length > 0 ? companyNames : DEFAULT_COMPANIES);

  // Get types for the current category
  const getTypesForCategory = (cat: string) => {
    if (mastersData && mastersData.categories[cat]) {
      return mastersData.categories[cat];
    }
    return ['Paid', 'Free', 'Trial', 'Enterprise', 'Other'];
  };

  const [formData, setFormData] = useState({
    subscriberName: initialData?.subscriberName || '',
    subscriptionName: initialData?.subscriptionName || '',
    details: initialData?.details || '',
    price: initialData?.price?.toString() || '',
    frequency: initialData?.frequency || Frequency.MONTHLY,
    companyName: initialData?.companyName || '',
    category: initialData?.category || '',
    subscriptionType: initialData?.subscriptionType || '',
    startDate: new Date().toISOString().split('T')[0],
    billingMonth: initialData?.billingMonth || MONTHS[new Date().getMonth()],
    billingYear: initialData?.billingYear?.toString() || new Date().getFullYear().toString(),
    autoRenewal: initialData?.autoRenewal ?? true,
    nextRenewalDate: initialData?.nextRenewalDate || ''
  });

  // Calculate Next Renewal Date automatically
  React.useEffect(() => {
    if (!formData.startDate) return;
    const date = new Date(formData.startDate);
    if (isNaN(date.getTime())) return;

    if (formData.frequency === Frequency.MONTHLY) date.setMonth(date.getMonth() + 1);
    else if (formData.frequency === Frequency.QUARTERLY) date.setMonth(date.getMonth() + 3);
    else if (formData.frequency === Frequency.HALF_YEARLY) date.setMonth(date.getMonth() + 6);
    else if (formData.frequency === Frequency.YEARLY) date.setFullYear(date.getFullYear() + 1);

    const nextDate = date.toISOString().split('T')[0];
    if (nextDate !== formData.nextRenewalDate) {
      setFormData(prev => ({ ...prev, nextRenewalDate: nextDate }));
    }
  }, [formData.startDate, formData.frequency]);

  // Effect to set initial subscriptionType when categories or mastersData changes
  React.useEffect(() => {
    if (initialData?.subscriptionType) return; // Don't override if we have initial data
    const currentTypes = getTypesForCategory(formData.category);
    if (currentTypes.length > 0 && !formData.subscriptionType) {
      setFormData(prev => ({ ...prev, subscriptionType: currentTypes[0] }));
    }
  }, [formData.category, mastersData, initialData?.subscriptionType]);

  const handleCategoryChange = (cat: string) => {
    const types = getTypesForCategory(cat);
    setFormData({
      ...formData,
      category: cat,
      subscriptionType: types[0] || ''
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formattedData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      billingYear: parseInt(formData.billingYear) || new Date().getFullYear(),
    };

    onSubmit(formattedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {initialData?.subscriptionNo && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4 relative overflow-hidden group">
          {/* Background decorative element */}
          <div className="absolute top-0 right-0 w-32 h-full bg-amber-100/50 -skew-x-12 translate-x-16 group-hover:translate-x-12 transition-transform duration-500" />
          
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-sm border border-amber-200/50">
              <RotateCcw className="text-amber-600 w-6 h-6 animate-spin-slow" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Renewing Subscription</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <p className="text-sm font-black text-amber-900 flex items-center gap-1.5">
                  <span className="opacity-50 text-[10px] font-bold">Original:</span> {initialData.subscriptionNo}
                </p>
                {initialData.renewalNo && (
                  <p className="text-sm font-black text-amber-700 flex items-center gap-1.5 border-l border-amber-200 pl-4">
                    <span className="opacity-60 text-[10px] font-bold">Renewal No:</span> {initialData.renewalNo}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Name of the Person</label>
          <select
            required
            className="w-full bg-zinc-50 border border-indigo-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
            value={formData.subscriberName}
            onChange={e => setFormData({ ...formData, subscriberName: e.target.value })}
          >
            <option value="" disabled>— Select Name of the Person —</option>
            {persons.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Company Name</label>
          <select
            required
            className="w-full bg-zinc-50 border border-indigo-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
            value={formData.companyName}
            onChange={e => setFormData({ ...formData, companyName: e.target.value })}
          >
            <option value="" disabled>— Select Company Name —</option>
            {companies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Category of Subscriptions</label>
          <select
            required
            className="w-full bg-zinc-50 border border-indigo-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
            value={formData.category}
            onChange={e => handleCategoryChange(e.target.value)}
          >
            <option value="" disabled>— Select Category —</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Name of Subscription</label>
          <select
            required
            disabled={!formData.category}
            className={`w-full bg-zinc-50 border border-indigo-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none ${!formData.category ? 'opacity-50 cursor-not-allowed' : ''}`}
            value={formData.subscriptionType}
            onChange={e => setFormData({ ...formData, subscriptionType: e.target.value })}
          >
            <option value="" disabled>— Select Name of Subscription —</option>
            {formData.category && getTypesForCategory(formData.category).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Vendor Name</label>
        <input
          required
          type="text"
          className="w-full bg-zinc-50 border border-indigo-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          placeholder="e.g. Amazon Prime, Adobe Acrobat, etc."
          value={formData.subscriptionName}
          onChange={e => setFormData({ ...formData, subscriptionName: e.target.value })}
        />
      </div>


      <div className="space-y-1">
        <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Remark of Purpose</label>
        <textarea
          required
          rows={3}
          className="w-full bg-zinc-50 border border-indigo-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
          placeholder="Describe the subscription purpose..."
          value={formData.details}
          onChange={e => setFormData({ ...formData, details: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Price (₹)</label>
          <input
            required
            type="text"
            className="w-full bg-zinc-50 border border-indigo-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-emerald-600"
            placeholder="999"
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Frequency</label>
          <select
            className="w-full bg-zinc-50 border border-indigo-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
            value={formData.frequency}
            onChange={e => setFormData({ ...formData, frequency: e.target.value as Frequency })}
          >
            {Object.values(Frequency).map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] mt-4">
        Create Subscription
      </button>
    </form>
  );
};
