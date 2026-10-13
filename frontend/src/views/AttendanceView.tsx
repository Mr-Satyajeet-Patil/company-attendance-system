import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  Search,
  Download,
  Filter,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  UserCheck
} from 'lucide-react';
import { api } from '../api';
import { AttendanceRecord, Employee } from '../types';

export const AttendanceView: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Manual Punch Modal
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualForm, setManualForm] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '09:00',
    check_out: '18:00',
    status: 'Present',
    notes: 'Manual punch approved by HR',
  });
  const [submittingManual, setSubmittingManual] = useState<boolean>(false);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAttendanceRecords({
        date: dateFilter,
        department: deptFilter,
        status: statusFilter,
        employee_id: searchFilter,
      });
      setRecords(res.records);
    } catch (e: unknown) {
      console.error(e);
      setError('Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, deptFilter, statusFilter, searchFilter]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Load employee list for manual punch dropdown
  useEffect(() => {
    api.getEmployees().then((res) => {
      setEmployees(res.employees);
      if (res.employees.length > 0) {
        setManualForm((prev) => ({ ...prev, employee_id: String(res.employees[0].id) }));
      }
    });
  }, []);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.employee_id) return;
    setSubmittingManual(true);
    try {
      await api.manualAttendanceOverride({
        employee_id: Number(manualForm.employee_id),
        date: manualForm.date,
        check_in: manualForm.check_in,
        check_out: manualForm.check_out,
        status: manualForm.status,
        notes: manualForm.notes,
      });
      setShowManualModal(false);
      loadRecords();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleExportCsv = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Attendance Records &amp; Timesheets
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {records.length} Logs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical workforce biometric logs, audit trails, working hour calculations, and compliance exports.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-bold transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Override / Add Punch</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-3xl">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name or ID..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Date Filter */}
        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Department Filter */}
        <div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Operations">Operations</option>
            <option value="Finance">Finance</option>
            <option value="Marketing">Marketing</option>
            <option value="IT">IT</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Half-Day">Half-Day</option>
            <option value="Absent">Absent</option>
          </select>

          {(dateFilter || deptFilter !== 'All' || statusFilter !== 'All' || searchFilter) && (
            <button
              onClick={() => {
                setDateFilter('');
                setDeptFilter('All');
                setStatusFilter('All');
                setSearchFilter('');
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              title="Clear filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
            <p className="text-xs">Fetching attendance logs...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <CalendarCheck className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-semibold text-slate-300">No attendance logs found</p>
            <p className="text-xs text-slate-400">Try adjusting your filters or punching via the Live Kiosk.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 pl-6">Employee</th>
                  <th className="py-4">Department</th>
                  <th className="py-4">Date</th>
                  <th className="py-4">Check-In</th>
                  <th className="py-4">Check-Out</th>
                  <th className="py-4">Hours</th>
                  <th className="py-4">Biometric Match</th>
                  <th className="py-4 pr-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        {r.face_image ? (
                          <img
                            src={r.face_image}
                            alt={r.employee_name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-700"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                            {r.employee_name[0]}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-white block text-sm">{r.employee_name}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {r.employee_id} &bull; {r.designation}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-slate-300 font-medium">{r.department}</td>
                    <td className="py-4 font-mono text-slate-300">{r.date}</td>
                    <td className="py-4 font-mono font-semibold text-white">{r.check_in}</td>
                    <td className="py-4 font-mono text-slate-300">{r.check_out}</td>
                    <td className="py-4 font-mono text-indigo-300 font-bold">
                      {r.work_hours > 0 ? `${r.work_hours} hrs` : '--'}
                    </td>
                    <td className="py-4">
                      {r.manual_override ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          Manual Edit
                        </span>
                      ) : (
                        <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {r.match_confidence}% Match
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-6 text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full font-bold text-[11px] ${
                          r.status === 'Present'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'Late'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : r.status === 'Half-Day'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Override Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <h3 className="font-extrabold text-white text-base">Manual Attendance Adjustment</h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Select Employee *</label>
                <select
                  required
                  value={manualForm.employee_id}
                  onChange={(e) => setManualForm({ ...manualForm, employee_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_id}) - {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Date *</label>
                <input
                  type="date"
                  required
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Check-In Time</label>
                  <input
                    type="time"
                    value={manualForm.check_in}
                    onChange={(e) => setManualForm({ ...manualForm, check_in: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Check-Out Time</label>
                  <input
                    type="time"
                    value={manualForm.check_out}
                    onChange={(e) => setManualForm({ ...manualForm, check_out: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Status</label>
                <select
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half-Day">Half-Day</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Reason / Audit Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Employee forgot card/punch"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  {submittingManual && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
