import React from 'react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  count?: number;
  isCollapsed?: boolean;
  hidden?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick, count, isCollapsed, hidden }) => {
  if (hidden) return null;
  return (
    <button 
      onClick={onClick}
      className={`sidebar-item w-full flex items-center justify-between ${active ? 'active' : ''} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
      title={isCollapsed ? label : ''}
    >
      <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="shrink-0">
          {icon}
        </div>
        {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300">{label}</span>}
      </div>
      {count !== undefined && count > 0 && (
        <span className={`${isCollapsed ? 'absolute top-1 right-1' : ''} bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center`}>
          {count}
        </span>
      )}
    </button>
  );
};
