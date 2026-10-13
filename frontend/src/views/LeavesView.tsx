import React, { useState, useEffect, useCallback } from 'react';
import {
  PlaneTakeoff,
  Plus,
  Check,
  X,
  Clock,
  Calendar,
  AlertCircle,
  RefreshCw,
  FileText,
  UserCheck
} from 'lucide-react';
import { api } from '../api';
import { LeaveRequestItem, Employee } from '../types';

export const LeavesView: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);

  // Apply Modal
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'Casual Leave',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadLeaves = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getLeaves(statusFilter);
      setLeaves(res.leaves);
    } catch (e: unknown) {
      console.error(e);
      setError('Failed to fetch leave requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  useEffect(() => {
    api.getEmployees().then((res) => {
      setEmployees(res.employees);
      if (res.employees.length > 0) {
        setLeaveForm((prev) => ({ ...prev, employee_id: String(res.employees[0].id) }));
      }
    });
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: 'Approved' | 'Rejected') => {
    try {
      await api.updateLeaveStatus(id, newStatus);
      loadLeaves();
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.employee_id) return;
    setSubmitting(true);
    try {
      await api.applyLeave({
        employee_id: Number(leaveForm.employee_id),
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        reason: leaveForm.reason,
      });
      setShowApplyModal(false);
      setLeaveForm((prev) => ({ ...prev, reason: '' }));
      loadLeaves();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Workforce Leave Management
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {leaves.length} Requests
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review time-off requests, sick leaves, and work-from-home authorizations.
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Apply Time Off</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 p-2 rounded-2xl w-fit">
        {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === st
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {st} Requests
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
            <p className="text-xs">Loading leave requests...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <PlaneTakeoff className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-semibold text-slate-300">No leave requests found</p>
            <p className="text-xs text-slate-400">All staff are on standard duty or no requests submitted.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 pl-6">Employee</th>
                  <th className="py-4">Department</th>
                  <th className="py-4">Type</th>
                  <th className="py-4">Duration</th>
                  <th className="py-4">Reason</th>
                  <th className="py-4">Status</th>
                  <th className="py-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-4 pl-6">
                      <span className="font-bold text-white block text-sm">{l.employee_name}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ID: {l.employee_id}
                      </span>
                    </td>
                    <td className="py-4 text-slate-300 font-medium">{l.department}</td>
                    <td className="py-4">
                      <span className="font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        {l.leave_type}
                      </span>
                    </td>
                    <td className="py-4 font-mono text-slate-300">
                      {l.start_date} &rarr; {l.end_date}
                    </td>
                    <td className="py-4 text-slate-300 max-w-xs truncate" title={l.reason}>
                      {l.reason || 'None provided'}
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          l.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : l.status === 'Pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-4 pr-6 text-right">
                      {l.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStatus(l.id, 'Approved')}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                            title="Approve Leave"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(l.id, 'Rejected')}
                            className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                            title="Reject Leave"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <h3 className="font-extrabold text-white text-base">Submit Leave Request</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Employee *</label>
                <select
                  required
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
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
                <label className="text-xs font-semibold text-slate-300">Leave Type *</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Paid Leave">Paid Leave</option>
                  <option value="Work From Home">Work From Home (WFH)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Reason</label>
                <textarea
                  rows={3}
                  placeholder="Reason for time off..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
