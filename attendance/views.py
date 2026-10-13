import os
import csv
import json
import base64
from datetime import datetime, timedelta

from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Q

from .models import Attendance, LeaveRequest, SystemSetting
from employees.models import Employee, Shift
from employees.face_recognition import match_face_against_database, recognize_employee


# Helper function to parse time
def calculate_duration_hours(start_time, end_time):
    if not start_time or not end_time:
        return 0.0
    dt_start = datetime.combine(datetime.today(), start_time)
    dt_end = datetime.combine(datetime.today(), end_time)
    if dt_end < dt_start:
        dt_end += timedelta(days=1)
    diff = dt_end - dt_start
    return max(0.0, round(diff.total_seconds() / 3600.0, 2))


# ==========================================
# REST API ENDPOINTS FOR REACT FRONTEND
# ==========================================

@csrf_exempt
def api_kiosk_punch(request):
    """
    Kiosk camera biometric punch endpoint.
    Receives face image (file upload or base64 JSON).
    Matches face against multi-angle employee embeddings.
    Records check-in or check-out with automatic hours and status calculation.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

    temp_path = None
    try:
        # Check for base64 JSON payload
        if request.content_type and 'application/json' in request.content_type:
            try:
                body = json.loads(request.body.decode('utf-8'))
            except Exception:
                return JsonResponse({'success': False, 'message': 'Malformed JSON payload.'}, status=400)

            b64_image = body.get('image', '')
            if not b64_image:
                return JsonResponse({'success': False, 'message': 'No face image data received.'}, status=400)

            if ',' in b64_image:
                b64_image = b64_image.split(',', 1)[1]

            try:
                img_bytes = base64.b64decode(b64_image)
                if len(img_bytes) < 100:
                    return JsonResponse({'success': False, 'matched': False, 'message': 'Image data is too small or corrupt.'}, status=400)
            except Exception:
                return JsonResponse({'success': False, 'matched': False, 'message': 'Invalid base64 image data.'}, status=400)

            temp_filename = f"kiosk_{timezone.now().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
            saved_file = default_storage.save(f"attendance_temp/{temp_filename}", ContentFile(img_bytes))
            temp_path = default_storage.path(saved_file)

        # Check for multipart file upload
        else:
            image_file = request.FILES.get('face_image')
            if not image_file:
                return JsonResponse({'success': False, 'message': 'No image file provided.'}, status=400)

            saved_file = default_storage.save(f"attendance_temp/{image_file.name}", image_file)
            temp_path = default_storage.path(saved_file)

        # Get system threshold if set
        threshold = 0.68
        try:
            thresh_setting = SystemSetting.objects.filter(key='recognition_threshold').first()
            if thresh_setting:
                threshold = float(thresh_setting.value)
        except Exception:
            pass

        # Perform high-accuracy multi-angle face verification
        match_result = match_face_against_database(temp_path, threshold=threshold)

        if not match_result['matched']:
            return JsonResponse({
                'success': False,
                'matched': False,
                'confidence': match_result.get('confidence', 0.0),
                'message': match_result.get('message', 'Face not recognized. Please face the camera and try again.')
            }, status=200)

        employee = match_result['employee']
        confidence = match_result['confidence']
        matched_angle = match_result['matched_angle']

        now = timezone.localtime()
        today = now.date()
        current_time = now.time()

        # Shift timing evaluation (dynamic from settings & employee shift)
        shift_start = datetime.strptime("09:00:00", "%H:%M:%S").time()
        grace_period_mins = 15

        try:
            grace_setting = SystemSetting.objects.filter(key='grace_period_mins').first()
            if grace_setting:
                grace_period_mins = int(grace_setting.value)
        except Exception:
            pass

        if employee.shift_name:
            shift_obj = Shift.objects.filter(name__iexact=employee.shift_name).first()
            if shift_obj:
                shift_start = shift_obj.start_time
                grace_period_mins = shift_obj.grace_period_minutes

        # Check existing attendance record for today
        attendance, created = Attendance.objects.get_or_create(
            employee=employee,
            date=today,
            defaults={
                'check_in': current_time,
                'status': 'Present',
                'match_confidence': confidence,
                'matched_angle': matched_angle,
                'notes': f"Auto-punched via biometric kiosk ({matched_angle or 'frontal'})"
            }
        )

        punch_type = "CHECK_IN"

        if created:
            # Evaluate if punch is Late
            dt_shift_start = datetime.combine(today, shift_start)
            dt_punch = datetime.combine(today, current_time)
            dt_grace_end = dt_shift_start + timedelta(minutes=grace_period_mins)

            if dt_punch > dt_grace_end:
                attendance.status = 'Late'
                diff_minutes = int((dt_punch - dt_shift_start).total_seconds() / 60)
                attendance.late_minutes = max(0, diff_minutes)
                attendance.save()

            message = f"Welcome, {employee.name}! Check-in recorded at {now.strftime('%I:%M %p')}."
        else:
            # Existing attendance found for today
            dt_punch = datetime.combine(today, current_time)
            dt_check_in = datetime.combine(today, attendance.check_in) if attendance.check_in else dt_punch

            # Debounce protection: if punched in less than 90 seconds ago and no checkout yet, prevent accidental double punch!
            diff_secs = (dt_punch - dt_check_in).total_seconds()
            if diff_secs < 90 and attendance.check_out is None:
                remaining_cd = max(1, int(90 - diff_secs))
                return JsonResponse({
                    'success': True,
                    'matched': True,
                    'punch_type': 'ALREADY_RECORDED',
                    'message': f"Check-in already logged for {employee.name} at {attendance.check_in.strftime('%I:%M %p')}. (Cooldown: {remaining_cd}s before check-out).",
                    'employee': {
                        'id': employee.id,
                        'employee_id': employee.employee_id,
                        'name': employee.name,
                        'department': employee.department,
                        'designation': employee.designation,
                        'face_image': employee.face_image.url if employee.face_image else None,
                    },
                    'record': {
                        'date': str(today),
                        'check_in': attendance.check_in.strftime('%I:%M %p'),
                        'check_out': None,
                        'status': attendance.status,
                        'work_hours': 0.0,
                        'confidence': confidence,
                        'matched_angle': matched_angle,
                    }
                })

            # Check-Out logic (records or updates departure punch)
            punch_type = "CHECK_OUT"
            attendance.check_out = current_time
            hours = calculate_duration_hours(attendance.check_in, attendance.check_out)
            attendance.work_hours = hours

            if hours >= 8.0:
                attendance.overtime_hours = round(hours - 8.0, 2)
            elif hours < 4.0:
                attendance.status = 'Half-Day'

            attendance.match_confidence = max(attendance.match_confidence, confidence)
            attendance.save()

            message = f"Goodbye, {employee.name}! Check-out recorded at {now.strftime('%I:%M %p')}. Total: {hours} hrs."

        return JsonResponse({
            'success': True,
            'matched': True,
            'punch_type': punch_type,
            'message': message,
            'employee': {
                'id': employee.id,
                'employee_id': employee.employee_id,
                'name': employee.name,
                'department': employee.department,
                'designation': employee.designation,
                'face_image': employee.face_image.url if employee.face_image else None,
            },
            'record': {
                'date': str(today),
                'check_in': attendance.check_in.strftime('%I:%M %p') if attendance.check_in else None,
                'check_out': attendance.check_out.strftime('%I:%M %p') if attendance.check_out else None,
                'status': attendance.status,
                'work_hours': attendance.work_hours,
                'confidence': confidence,
                'matched_angle': matched_angle,
            }
        })

    except Exception as e:
        return JsonResponse({'success': False, 'message': f"Internal server error: {str(e)}"}, status=500)
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@csrf_exempt
def api_dashboard_stats(request):
    """
    Returns high-level KPI metrics, department analytics, and 7-day trend.
    """
    today = timezone.localdate()
    total_employees = Employee.objects.filter(is_active=True).count()

    today_records = Attendance.objects.filter(date=today).select_related('employee')
    present_today = today_records.filter(status='Present').count()
    late_today = today_records.filter(status='Late').count()
    half_day_today = today_records.filter(status='Half-Day').count()
    on_leave_today = LeaveRequest.objects.filter(
        start_date__lte=today,
        end_date__gte=today,
        status='Approved'
    ).count()

    absent_today = max(0, total_employees - (present_today + late_today + half_day_today + on_leave_today))
    attendance_rate = round(((present_today + late_today + half_day_today) / total_employees * 100), 1) if total_employees > 0 else 0

    # 7-day trend
    trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_records = Attendance.objects.filter(date=day)
        p = day_records.filter(status='Present').count()
        l = day_records.filter(status='Late').count()
        h = day_records.filter(status='Half-Day').count()
        trend.append({
            'date': day.strftime('%a, %b %d'),
            'raw_date': str(day),
            'present': p,
            'late': l,
            'half_day': h,
            'total_present': p + l + h,
            'absent': max(0, total_employees - (p + l + h)),
        })

    # Department breakdown
    depts = Employee.objects.filter(is_active=True).values('department').annotate(total=Count('id'))
    dept_stats = []
    for d in depts:
        name = d['department'] or 'General'
        tot = d['total']
        pres = today_records.filter(employee__department=name).count()
        dept_stats.append({
            'department': name,
            'total': tot,
            'present': pres,
            'absent': max(0, tot - pres),
            'rate': round((pres / tot * 100), 1) if tot > 0 else 0
        })

    # Recent 10 live punch activities
    recent_punches = []
    for r in today_records.order_by('-updated_at')[:10]:
        recent_punches.append({
            'id': r.id,
            'employee_name': r.employee.name,
            'employee_id': r.employee.employee_id,
            'department': r.employee.department,
            'face_image': r.employee.face_image.url if r.employee.face_image else None,
            'check_in': r.check_in.strftime('%I:%M %p') if r.check_in else None,
            'check_out': r.check_out.strftime('%I:%M %p') if r.check_out else None,
            'status': r.status,
            'confidence': r.match_confidence,
            'work_hours': r.work_hours,
        })

    return JsonResponse({
        'success': True,
        'summary': {
            'total_employees': total_employees,
            'present_today': present_today,
            'late_today': late_today,
            'half_day_today': half_day_today,
            'on_leave_today': on_leave_today,
            'absent_today': absent_today,
            'attendance_rate': attendance_rate,
            'today_date': today.strftime('%A, %B %d, %Y'),
        },
        'trend': trend,
        'department_stats': dept_stats,
        'recent_punches': recent_punches,
    })


@csrf_exempt
def api_attendance_records(request):
    """
    GET: List attendance records with filtering by date range, department, status, employee.
    POST: Manual attendance entry / override by HR/Admin.
    """
    if request.method == 'GET':
        records = Attendance.objects.select_related('employee').all()

        date = request.GET.get('date')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        emp_id = request.GET.get('employee_id')
        dept = request.GET.get('department')
        status = request.GET.get('status')

        if date:
            records = records.filter(date=date)
        elif start_date and end_date:
            records = records.filter(date__range=[start_date, end_date])

        if emp_id:
            records = records.filter(
                Q(employee__employee_id__icontains=emp_id) |
                Q(employee__name__icontains=emp_id)
            )

        if dept and dept != 'All':
            records = records.filter(employee__department__iexact=dept)

        if status and status != 'All':
            records = records.filter(status__iexact=status)

        data = []
        for r in records[:500]:
            data.append({
                'id': r.id,
                'employee_id': r.employee.employee_id,
                'employee_name': r.employee.name,
                'department': r.employee.department,
                'designation': r.employee.designation,
                'face_image': r.employee.face_image.url if r.employee.face_image else None,
                'date': str(r.date),
                'check_in': r.check_in.strftime('%I:%M %p') if r.check_in else '--:--',
                'check_out': r.check_out.strftime('%I:%M %p') if r.check_out else '--:--',
                'status': r.status,
                'work_hours': r.work_hours,
                'overtime_hours': r.overtime_hours,
                'late_minutes': r.late_minutes,
                'match_confidence': r.match_confidence,
                'notes': r.notes or '',
                'manual_override': r.manual_override,
            })

        return JsonResponse({'success': True, 'records': data, 'total': len(data)})

    elif request.method == 'POST':
        try:
            body = json.loads(request.body.decode('utf-8'))
            emp_id = body.get('employee_id')
            date_str = body.get('date', str(timezone.localdate()))
            check_in_str = body.get('check_in')
            check_out_str = body.get('check_out')
            status = body.get('status', 'Present')
            notes = body.get('notes', 'Manual entry by Administrator')

            emp = Employee.objects.get(id=emp_id)
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()

            check_in_time = datetime.strptime(check_in_str, '%H:%M').time() if check_in_str else None
            check_out_time = datetime.strptime(check_out_str, '%H:%M').time() if check_out_str else None

            hours = calculate_duration_hours(check_in_time, check_out_time)

            rec, _ = Attendance.objects.update_or_create(
                employee=emp,
                date=date_obj,
                defaults={
                    'check_in': check_in_time,
                    'check_out': check_out_time,
                    'status': status,
                    'work_hours': hours,
                    'notes': notes,
                    'manual_override': True,
                    'match_confidence': 100.0,
                }
            )

            return JsonResponse({'success': True, 'message': 'Attendance record saved successfully.', 'id': rec.id})

        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
def api_leaves(request):
    """
    GET: List all leaves.
    POST: Submit leave request.
    PATCH: Approve or reject leave.
    """
    if request.method == 'GET':
        leaves = LeaveRequest.objects.select_related('employee').all()
        status_filter = request.GET.get('status')
        if status_filter and status_filter != 'All':
            leaves = leaves.filter(status=status_filter)

        data = [{
            'id': l.id,
            'employee_id': l.employee.employee_id,
            'employee_name': l.employee.name,
            'department': l.employee.department,
            'leave_type': l.leave_type,
            'start_date': str(l.start_date),
            'end_date': str(l.end_date),
            'reason': l.reason,
            'status': l.status,
            'applied_at': l.applied_at.strftime('%Y-%m-%d %H:%M'),
        } for l in leaves]

        return JsonResponse({'success': True, 'leaves': data})

    elif request.method == 'POST':
        try:
            body = json.loads(request.body.decode('utf-8'))
            emp_id = body.get('employee_id')
            emp = Employee.objects.get(id=emp_id)

            leave = LeaveRequest.objects.create(
                employee=emp,
                leave_type=body.get('leave_type', 'Casual Leave'),
                start_date=body.get('start_date'),
                end_date=body.get('end_date'),
                reason=body.get('reason', ''),
                status='Pending'
            )
            return JsonResponse({'success': True, 'message': 'Leave application submitted.', 'id': leave.id})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

    elif request.method == 'PATCH':
        try:
            body = json.loads(request.body.decode('utf-8'))
            leave_id = body.get('leave_id')
            new_status = body.get('status')  # 'Approved' or 'Rejected'
            leave = LeaveRequest.objects.get(id=leave_id)
            leave.status = new_status
            leave.reviewed_at = timezone.now()
            leave.save()
            return JsonResponse({'success': True, 'message': f"Leave status updated to {new_status}."})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
def api_export_csv(request):
    """
    Exports attendance data as CSV for enterprise payroll and auditing.
    """
    response = HttpResponse(content_type='text/csv')
    filename = f"PulseAttend_Report_{timezone.localdate()}.csv"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    writer = csv.writer(response)
    writer.writerow([
        'Record ID', 'Employee ID', 'Employee Name', 'Department', 'Designation',
        'Date', 'Check In', 'Check Out', 'Hours Worked', 'Overtime', 'Status', 'Match Confidence %'
    ])

    records = Attendance.objects.select_related('employee').all().order_by('-date')
    for r in records:
        writer.writerow([
            r.id,
            r.employee.employee_id,
            r.employee.name,
            r.employee.department,
            r.employee.designation,
            r.date,
            r.check_in.strftime('%H:%M:%S') if r.check_in else '',
            r.check_out.strftime('%H:%M:%S') if r.check_out else '',
            r.work_hours,
            r.overtime_hours,
            r.status,
            r.match_confidence,
        ])

    return response


@csrf_exempt
def api_system_settings(request):
    """
    GET & POST settings (Threshold, Company Name, etc.)
    """
    if request.method == 'GET':
        defaults = {
            'company_name': 'PulseAttend 360 AI',
            'recognition_threshold': '0.68',
            'grace_period_mins': '15',
            'standard_work_hours': '8.0',
            'kiosk_audio_chime': 'true',
        }
        stored = {s.key: s.value for s in SystemSetting.objects.all()}
        defaults.update(stored)
        return JsonResponse({'success': True, 'settings': defaults})

    elif request.method == 'POST':
        try:
            body = json.loads(request.body.decode('utf-8'))
            for k, v in body.items():
                SystemSetting.objects.update_or_create(key=k, defaults={'value': str(v)})
            return JsonResponse({'success': True, 'message': 'System settings saved.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)


# ==========================================
# LEGACY HTML TEMPLATE VIEWS (COMPATIBILITY)
# ==========================================

def mark_attendance_page(request):
    return render(request, 'attendance/mark_attendance.html')


def mark_attendance(request):
    # Wrapper delegating to api_kiosk_punch for full backwards compatibility
    return api_kiosk_punch(request)


def attendance_dashboard(request):
    today = timezone.localdate()
    total_employees = Employee.objects.filter(is_active=True).count()
    present_today = Attendance.objects.filter(date=today, status='Present').count()
    late_today = Attendance.objects.filter(date=today, status='Late').count()
    absent_today = max(0, total_employees - present_today - late_today)
    today_attendance = Attendance.objects.filter(date=today).select_related('employee')

    context = {
        'today': today,
        'total_employees': total_employees,
        'present_today': present_today,
        'late_today': late_today,
        'absent_today': absent_today,
        'today_attendance': today_attendance,
    }
    return render(request, 'attendance/dashboard.html', context)


def attendance_history(request):
    records = Attendance.objects.select_related('employee').all()
    employees = Employee.objects.filter(is_active=True)
    return render(request, 'attendance/history.html', {'attendance_records': records, 'employees': employees})


def attendance_reports(request):
    today = timezone.localdate()
    return render(request, 'attendance/reports.html', {'today': today})
