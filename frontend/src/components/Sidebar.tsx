import React from 'react';
import {
  Camera,
  LayoutDashboard,
  Users,
  CalendarCheck,
  PlaneTakeoff,
  Settings,
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, activeCount }) => {
  const menuItems = [
    {
      id: 'kiosk',
      label: 'Live Biometric Kiosk',
      icon: Camera,
      badge: 'LIVE TERMINAL',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      description: 'Face recognition punch'
    },
    {
      id: 'dashboard',
      label: 'Operations & Analytics',
      icon: LayoutDashboard,
      description: 'KPIs, trends & activity'
    },
    {
      id: 'employees',
      label: 'Employee Directory',
      icon: Users,
      badge: `${activeCount}`,
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      description: 'Profiles & multi-shot faces'
    },
    {
      id: 'attendance',
      label: 'Attendance & Timesheets',
      icon: CalendarCheck,
      description: 'Audit logs & CSV export'
    },
    {
      id: 'leaves',
      label: 'Leave Management',
      icon: PlaneTakeoff,
      description: 'Approvals & time-off'
    },
    {
      id: 'settings',
      label: 'System & Shift Rules',
      icon: Settings,
      description: 'Thresholds & schedules'
    },
  ];

  return (
    <aside className="w-72 bg-slate-900/90 backdrop-blur-xl border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                PulseAttend
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                360°
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400">Enterprise AI Biometrics</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
          Navigation
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full text-left px-3.5 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600/20 to-indigo-500/10 border border-indigo-500/30 text-white shadow-md shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-lg shadow-indigo-500" />
              )}
              <div
                className={`p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 group-hover:text-white group-hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-400'}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5 font-normal">
                  {item.description}
                </p>
              </div>

              <ChevronRight
                className={`w-4 h-4 text-slate-600 transition-transform ${
                  isActive ? 'text-indigo-400 translate-x-0.5' : 'group-hover:translate-x-0.5'
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* Engine Status Footer */}
      <div className="p-4 m-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">Facenet512 Engine</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Active
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Multi-Angle Vector Centroid (Cosine Dist &le; 0.32)
        </p>
      </div>
    </aside>
  );
};
