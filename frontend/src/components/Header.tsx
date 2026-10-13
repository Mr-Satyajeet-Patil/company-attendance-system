import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, Sparkles, Wifi } from 'lucide-react';

interface HeaderProps {
  onOpenKiosk: () => void;
  todayDate?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenKiosk, todayDate }) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-18 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80 px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-100 text-base">Workforce Presence Portal</h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              HQ Campus
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {todayDate || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Real-time Clock */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span className="font-mono text-sm font-semibold tracking-wider text-slate-200">
            {timeStr || '12:00:00 PM'}
          </span>
        </div>

        {/* System Online Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Wifi className="w-3.5 h-3.5" />
          <span>Biometric Online</span>
        </div>

        {/* Quick Kiosk Launch Button */}
        <button
          onClick={onOpenKiosk}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch Kiosk Terminal</span>
        </button>
      </div>
    </header>
  );
};
