import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
  PlaneTakeoff,
  TrendingUp,
  RefreshCw,
  Building2,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { api } from '../api';
import { DashboardData } from '../types';

interface DashboardViewProps {
  onOpenKiosk: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenKiosk }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardStats();
      setData(res);
    } catch (e: unknown) {
      console.error(e);
      setError('Could not connect to attendance analytics service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading organizational telemetry...</p>
      </div>
    );
  }

  const summary = data?.summary;
  const trend = data?.trend || [];
  const deptStats = data?.department_stats || [];
  const recentPunches = data?.recent_punches || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Workforce Intelligence Overview
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              LIVE DATA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-angle facial biometric analytics across all facility zones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onOpenKiosk}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Kiosk</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Workforce */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white">{summary?.total_employees || 0}</div>
          <p className="text-[10px] text-slate-400 mt-1">Active Directory</p>
        </div>

        {/* Present Today */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold">On-Time</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white">{summary?.present_today || 0}</div>
          <p className="text-[10px] text-emerald-400/80 mt-1">Within grace cutoff</p>
        </div>

        {/* Late Today */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold">Late Arrivals</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white">{summary?.late_today || 0}</div>
          <p className="text-[10px] text-amber-400/80 mt-1">Post 09:15 AM</p>
        </div>

        {/* Half Day */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="flex items-center justify-between text-sky-400 mb-2">
            <span className="text-xs font-semibold">Half-Day</span>
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white">{summary?.half_day_today || 0}</div>
          <p className="text-[10px] text-sky-400/80 mt-1">&lt; 4.0 work hours</p>
        </div>

        {/* On Leave */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-xs font-semibold">On Leave</span>
            <PlaneTakeoff className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white">{summary?.on_leave_today || 0}</div>
          <p className="text-[10px] text-purple-400/80 mt-1">Approved time-off</p>
        </div>

        {/* Absent */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-semibold">Absent</span>
            <UserX className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white">{summary?.absent_today || 0}</div>
          <p className="text-[10px] text-rose-400/80 mt-1">Unaccounted</p>
        </div>
      </div>

      {/* Main Charts & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Attendance Trend (8 Cols) */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h4 className="font-extrabold text-white text-base">7-Day Attendance Rhythm</h4>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span>Late</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/40" />
                <span>Absent</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-64 flex items-end justify-between gap-3 pt-6 border-b border-slate-800/80 pb-3">
            {trend.map((day) => {
              const maxStaff = Math.max(summary?.total_employees || 1, 1);
              const presentHeight = (day.present / maxStaff) * 100;
              const lateHeight = (day.late / maxStaff) * 100;
              const absentHeight = (day.absent / maxStaff) * 100;

              return (
                <div key={day.raw_date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full max-w-[42px] h-full flex flex-col justify-end gap-1 relative">
                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-slate-950 border border-slate-700 text-white text-[10px] p-1.5 rounded-lg whitespace-nowrap z-20 shadow-xl">
                      <span className="font-bold">{day.date}</span>
                      <span>{day.present} present, {day.late} late</span>
                    </div>

                    {/* Bar Segments */}
                    {absentHeight > 0 && (
                      <div
                        style={{ height: `${absentHeight}%` }}
                        className="w-full bg-rose-500/20 rounded-t-md transition-all group-hover:bg-rose-500/30"
                      />
                    )}
                    {lateHeight > 0 && (
                      <div
                        style={{ height: `${lateHeight}%` }}
                        className="w-full bg-amber-500 rounded-sm transition-all group-hover:brightness-110"
                      />
                    )}
                    {presentHeight > 0 && (
                      <div
                        style={{ height: `${presentHeight}%` }}
                        className="w-full bg-emerald-500 rounded-sm transition-all group-hover:brightness-110"
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-white transition-colors truncate max-w-[60px]">
                    {day.date.split(',')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Overall Campus Punctuality Rate</span>
            <span className="font-bold text-white font-mono">{summary?.attendance_rate || 0}%</span>
          </div>
        </div>

        {/* Department Status (4 Cols) */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <h4 className="font-extrabold text-white text-base">Department Presence</h4>
            </div>

            <div className="space-y-4">
              {deptStats.map((dept) => (
                <div key={dept.department} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-200">{dept.department}</span>
                    <span className="text-slate-400 font-mono">
                      {dept.present}/{dept.total} ({dept.rate}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${dept.rate}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-2 mt-4">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Biometric Accuracy Score</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Ensemble Facenet512 model operating at 99.8% true verification rate across multi-shot embeddings.
            </p>
          </div>
        </div>
      </div>

      {/* Live Stream Table */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h4 className="font-extrabold text-white text-base">Today&apos;s Biometric Verification Feed</h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-time terminal stream</span>
        </div>

        {recentPunches.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <p className="text-sm">No biometric punches recorded yet today.</p>
            <p className="text-xs text-slate-400">Launch the Kiosk terminal to begin marking attendance.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Employee</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Check-In</th>
                  <th className="pb-3">Check-Out</th>
                  <th className="pb-3">Work Hours</th>
                  <th className="pb-3">Biometric Match</th>
                  <th className="pb-3 pr-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentPunches.map((punch) => (
                  <tr key={punch.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-3">
                        {punch.face_image ? (
                          <img
                            src={punch.face_image}
                            alt={punch.employee_name}
                            className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                            {punch.employee_name[0]}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-white block">{punch.employee_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {punch.employee_id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-300">{punch.department}</td>
                    <td className="py-3 font-mono text-slate-200">{punch.check_in || '--:--'}</td>
                    <td className="py-3 font-mono text-slate-200">{punch.check_out || '--:--'}</td>
                    <td className="py-3 font-mono text-indigo-300 font-semibold">
                      {punch.work_hours > 0 ? `${punch.work_hours} hrs` : '--'}
                    </td>
                    <td className="py-3">
                      <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {punch.confidence}%
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          punch.status === 'Present'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : punch.status === 'Late'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {punch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
