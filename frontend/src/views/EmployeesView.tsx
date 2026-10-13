import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  Camera,
  CheckCircle2,
  AlertCircle,
  Building2,
  Briefcase,
  Mail,
  Phone,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Edit2,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { api } from '../api';
import { Employee } from '../types';
import { MultiPhotoRegisterModal } from './MultiPhotoRegisterModal';

export const EmployeesView: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedEmployeeForMultiFace, setSelectedEmployeeForMultiFace] = useState<Employee | null>(null);

  // New Employee Form State
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    phone: '',
    department: 'Engineering',
    designation: 'Software Engineer',
    shift_name: 'General Shift (09:00 - 18:00)',
  });
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [empRes, deptRes] = await Promise.all([
        api.getEmployees(search, selectedDept),
        api.getDepartments(),
      ]);
      setEmployees(empRes.employees);
      setDepartments(deptRes.departments);
    } catch (e: unknown) {
      console.error(e);
      setError('Failed to fetch employee records.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedDept]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const res = await api.createEmployee(formData);
      if (res.success) {
        setShowAddModal(false);
        setFormData({
          employee_id: '',
          name: '',
          email: '',
          phone: '',
          department: 'Engineering',
          designation: 'Software Engineer',
          shift_name: 'General Shift (09:00 - 18:00)',
        });
        await loadData();

        // Prompt to register faces immediately for the new employee!
        if (res.employee) {
          setSelectedEmployeeForMultiFace(res.employee);
        }
      } else {
        setFormError(res.message || 'Creation failed');
      }
    } catch (err: unknown) {
      setFormError('Failed to communicate with backend server.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    try {
      await api.updateEmployee(emp.id, { is_active: !emp.is_active });
      loadData();
    } catch (err: unknown) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Employee Biometric Directory
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {employees.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage profiles and multi-shot facial embeddings for high-accuracy workforce recognition.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-3xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Department Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedDept('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedDept === 'All'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Departments
          </button>
          {departments.map((dept) => (
            <button
              key={dept.name}
              onClick={() => setSelectedDept(dept.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedDept === dept.name
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>
      </div>

      {/* Employee List Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
          <p className="text-xs">Loading employee database...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-900/30 rounded-3xl border border-slate-800">
          <Users className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm font-semibold text-slate-300">No employees found</p>
          <p className="text-xs text-slate-400">Click &apos;Add New Employee&apos; to register staff.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-lg"
            >
              {/* Profile Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    {emp.face_image ? (
                      <div className="relative">
                        <img
                          src={emp.face_image}
                          alt={emp.name}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700 group-hover:border-indigo-500/60 transition-colors"
                        />
                        {emp.has_face_registered && (
                          <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-slate-950">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border-2 border-indigo-500/30 flex items-center justify-center font-bold text-lg text-indigo-300">
                        {emp.name[0]}
                      </div>
                    )}

                    <div>
                      <h4 className="font-bold text-white text-base leading-tight group-hover:text-indigo-300 transition-colors">
                        {emp.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{emp.designation}</p>
                      <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                        ID: {emp.employee_id}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      emp.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {emp.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Details list */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      Department
                    </span>
                    <span className="font-semibold">{emp.department}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      Email
                    </span>
                    <span className="font-mono truncate max-w-[170px]">{emp.email}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                      Biometric Accuracy
                    </span>
                    {emp.sample_count >= 3 ? (
                      <span className="text-emerald-400 font-bold font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {emp.sample_count} Angles (High &gt;99%)
                      </span>
                    ) : emp.sample_count >= 1 ? (
                      <span className="text-amber-400 font-bold font-mono text-[11px] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        {emp.sample_count} Angle (Basic)
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold font-mono text-[11px] bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        Unregistered
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  onClick={() => setSelectedEmployeeForMultiFace(emp)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  title="Capture 3-4 facial angles for maximum accuracy"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>
                    {emp.sample_count >= 3 ? 'Recalibrate 360°' : 'Register 3-4 Photos'}
                  </span>
                </button>

                <button
                  onClick={() => handleToggleActive(emp)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                  title={emp.is_active ? 'Deactivate Employee' : 'Activate Employee'}
                >
                  {emp.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <h3 className="font-extrabold text-white text-lg">Add New Employee</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-104"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="jane@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="IT">IT</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Architect"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-slate-300">
                <p className="font-semibold text-indigo-300 mb-0.5">Biometric Setup Notice</p>
                After creating this employee, you will be automatically prompted to capture their 3-4 facial angles for maximum recognition accuracy.
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save &amp; Continue to Face Registration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Angle 4-Photo Modal */}
      {selectedEmployeeForMultiFace && (
        <MultiPhotoRegisterModal
          employee={selectedEmployeeForMultiFace}
          onClose={() => setSelectedEmployeeForMultiFace(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
