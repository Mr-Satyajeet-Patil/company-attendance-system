import {
  Employee,
  EmployeeDetail,
  AttendanceRecord,
  DashboardData,
  LeaveRequestItem,
  KioskPunchResponse
} from './types';

const BASE_URL = '';

export const api = {
  // Dashboard
  async getDashboardStats(): Promise<DashboardData> {
    const res = await fetch(`${BASE_URL}/api/dashboard/stats/`);
    if (!res.ok) throw new Error('Failed to load dashboard metrics');
    return res.json();
  },

  // Kiosk Biometric Punch
  async punchAttendance(base64Image: string): Promise<KioskPunchResponse> {
    const res = await fetch(`${BASE_URL}/api/kiosk/punch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });
    return res.json();
  },

  // Employees
  async getEmployees(search = '', department = '', status = ''): Promise<{ success: boolean; employees: Employee[]; total: number }> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (department && department !== 'All') params.append('department', department);
    if (status && status !== 'All') params.append('status', status);

    const res = await fetch(`${BASE_URL}/employees/api/list/?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch employees');
    return res.json();
  },

  async getEmployeeDetail(id: number): Promise<{ success: boolean; employee: EmployeeDetail }> {
    const res = await fetch(`${BASE_URL}/employees/api/${id}/`);
    if (!res.ok) throw new Error('Failed to fetch employee details');
    return res.json();
  },

  async createEmployee(data: {
    employee_id: string;
    name: string;
    email: string;
    phone?: string;
    department: string;
    designation: string;
    shift_name: string;
  }) {
    const res = await fetch(`${BASE_URL}/employees/api/list/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateEmployee(id: number, data: Partial<Employee>) {
    const res = await fetch(`${BASE_URL}/employees/api/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteEmployee(id: number) {
    const res = await fetch(`${BASE_URL}/employees/api/${id}/`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Multi-Angle Biometric Registration (3-4 photos)
  async registerMultiAngleFaces(employeeId: number, samples: { angle: string; image: string }[]) {
    const res = await fetch(`${BASE_URL}/employees/api/${employeeId}/register-faces/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ samples }),
    });
    return res.json();
  },

  // Departments
  async getDepartments(): Promise<{ success: boolean; departments: { name: string; count: number }[] }> {
    const res = await fetch(`${BASE_URL}/employees/api/departments/`);
    if (!res.ok) throw new Error('Failed to fetch departments');
    return res.json();
  },

  // Shifts
  async getShifts() {
    const res = await fetch(`${BASE_URL}/employees/api/shifts/`);
    return res.json();
  },

  // Attendance Records
  async getAttendanceRecords(filters: {
    date?: string;
    start_date?: string;
    end_date?: string;
    employee_id?: string;
    department?: string;
    status?: string;
  }): Promise<{ success: boolean; records: AttendanceRecord[]; total: number }> {
    const params = new URLSearchParams();
    if (filters.date) params.append('date', filters.date);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    if (filters.department && filters.department !== 'All') params.append('department', filters.department);
    if (filters.status && filters.status !== 'All') params.append('status', filters.status);

    const res = await fetch(`${BASE_URL}/api/records/?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch attendance records');
    return res.json();
  },

  async manualAttendanceOverride(data: {
    employee_id: number;
    date: string;
    check_in?: string;
    check_out?: string;
    status: string;
    notes?: string;
  }) {
    const res = await fetch(`${BASE_URL}/api/records/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Leaves
  async getLeaves(status = 'All'): Promise<{ success: boolean; leaves: LeaveRequestItem[] }> {
    const res = await fetch(`${BASE_URL}/api/leaves/?status=${encodeURIComponent(status)}`);
    return res.json();
  },

  async applyLeave(data: {
    employee_id: number;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
  }) {
    const res = await fetch(`${BASE_URL}/api/leaves/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateLeaveStatus(leave_id: number, status: 'Approved' | 'Rejected') {
    const res = await fetch(`${BASE_URL}/api/leaves/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leave_id, status }),
    });
    return res.json();
  },

  // System Settings
  async getSettings() {
    const res = await fetch(`${BASE_URL}/api/settings/`);
    return res.json();
  },

  async updateSettings(settings: Record<string, string>) {
    const res = await fetch(`${BASE_URL}/api/settings/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  // Export CSV
  getExportCsvUrl(): string {
    return `${BASE_URL}/api/export/csv/`;
  }
};
