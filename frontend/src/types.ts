export interface Employee {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  designation: string;
  shift_name: string;
  face_image: string | null;
  sample_count: number;
  has_face_registered: boolean;
  is_active: boolean;
  joining_date?: string | null;
  created_at: string;
}

export interface EmployeeDetail extends Employee {
  samples: {
    id: number;
    sample_type: string;
    image_url: string | null;
    has_embedding: boolean;
    created_at: string;
  }[];
  stats: {
    total_presents: number;
    total_late: number;
  };
}

export interface AttendanceRecord {
  id: number;
  employee_id: string;
  employee_name: string;
  department: string;
  designation: string;
  face_image: string | null;
  date: string;
  check_in: string;
  check_out: string;
  status: 'Present' | 'Late' | 'Half-Day' | 'Absent' | 'On Leave';
  work_hours: number;
  overtime_hours: number;
  late_minutes: number;
  match_confidence: number;
  notes?: string;
  manual_override: boolean;
}

export interface DashboardSummary {
  total_employees: number;
  present_today: number;
  late_today: number;
  half_day_today: number;
  on_leave_today: number;
  absent_today: number;
  attendance_rate: number;
  today_date: string;
}

export interface AttendanceTrendDay {
  date: string;
  raw_date: string;
  present: number;
  late: number;
  half_day: number;
  total_present: number;
  absent: number;
}

export interface DepartmentStat {
  department: string;
  total: number;
  present: number;
  absent: number;
  rate: number;
}

export interface LivePunchItem {
  id: number;
  employee_name: string;
  employee_id: string;
  department: string;
  face_image: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string;
  confidence: number;
  work_hours: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  trend: AttendanceTrendDay[];
  department_stats: DepartmentStat[];
  recent_punches: LivePunchItem[];
}

export interface LeaveRequestItem {
  id: number;
  employee_id: string;
  employee_name: string;
  department: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  applied_at: string;
}

export interface KioskPunchResponse {
  success: boolean;
  matched: boolean;
  punch_type?: 'CHECK_IN' | 'CHECK_OUT' | 'ALREADY_RECORDED';
  message: string;
  confidence?: number;
  employee?: {
    id: number;
    employee_id: string;
    name: string;
    department: string;
    designation: string;
    face_image: string | null;
  };
  record?: {
    date: string;
    check_in: string | null;
    check_out: string | null;
    status: string;
    work_hours: number;
    confidence: number;
    matched_angle: string | null;
  };
}
