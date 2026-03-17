import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  layout?: 'vertical' | 'horizontal';
  trend?: {
    value: string;
    isUp: boolean;
  };
  gradient?: string;
  children?: React.ReactNode;
  valueColor?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title, value, subtitle, icon, color, bgColor, borderColor, layout = 'vertical', trend, gradient, children, valueColor
}) => {
  const cardStyle = gradient
    ? { background: gradient }
    : {};

  if (layout === 'horizontal') {
    return (
      <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        className={`bg-white p-5 rounded-2xl border ${borderColor} shadow-sm hover:shadow-xl transition-all cursor-default relative overflow-hidden group`}
        style={cardStyle}
      >
        <div className="flex items-center gap-4 relative z-10">
          <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center ${color} border ${borderColor} shadow-inner group-hover:rotate-6 transition-transform`}>
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{title}</p>
            <h4 className={`text-xl font-black ${valueColor || 'text-zinc-900'}`}>{value}</h4>
            {subtitle && <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{subtitle}</p>}
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-black ${trend.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.value}
            </div>
          )}
        </div>
        {gradient && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] pointer-events-none" />}
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.03 }}
      className={`bg-white p-6 rounded-3xl border ${borderColor} shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden cursor-default`}
      style={cardStyle}
    >
      {/* Decorative gradient blob */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${bgColor} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className={`w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center ${color} border ${borderColor} shadow-lg shadow-black/5 group-hover:scale-110 group-hover:rotate-3 transition-all`}>
            <div className="scale-110">{icon}</div>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black ${trend.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.value}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-black text-zinc-400 py-1 uppercase tracking-[0.2em]">{title}</p>
          <h4 className={`text-3xl font-black tracking-tight ${valueColor || 'text-zinc-900'}`}>{value}</h4>
          {subtitle && (
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} />
              <p className="text-xs text-zinc-500 font-bold">{subtitle}</p>
            </div>
          )}
        </div>
        {children && <div className="mt-4 pt-4 border-t border-slate-50">{children}</div>}
      </div>

      {gradient && <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px] pointer-events-none" />}
    </motion.div>
  );
};
