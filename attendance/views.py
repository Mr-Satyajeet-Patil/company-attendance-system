
import os

from django.shortcuts import render
from django.http import JsonResponse
from django.utils import timezone
from django.core.files.storage import default_storage

from django.shortcuts import render
from .models import Attendance
from employees.models import Employee

from employees.face_recognition import recognize_employee



def mark_attendance_page(request):
    return render(
        request,
        'attendance/mark_attendance.html'
    )


def mark_attendance(request):

    if request.method != 'POST':
        return JsonResponse({
            'message': 'Invalid request.'
        }, status=400)

    image = request.FILES.get('face_image')

    if not image:
        return JsonResponse({
            'message': 'No face image received.'
        }, status=400)

    file_path = default_storage.save(
        'attendance_temp/' + image.name,
        image
    )

    full_path = default_storage.path(file_path)

    try:

        employee = recognize_employee(full_path)

        if employee is None:

            return JsonResponse({
                'message': 'Face not recognized.'
            })

        now = timezone.localtime()
        today = now.date()

        attendance, created = Attendance.objects.get_or_create(
            employee=employee,
            date=today,
            defaults={
                'check_in': now.time(),
                'status': 'Present'
            }
        )

        if created:

            message = (
                f'Attendance marked for '
                f'{employee.name}. '
                f'Check-in: {now.strftime("%I:%M %p")}'
            )

        else:

            if attendance.check_out is None:

                attendance.check_out = now.time()
                attendance.save()

                message = (
                    f'Check-out recorded for '
                    f'{employee.name}. '
                    f'Time: {now.strftime("%I:%M %p")}'
                )

            else:

                message = (
                    f'{employee.name} has already '
                    f'checked in and out today.'
                )

        return JsonResponse({
            'message': message,
            'employee_id': employee.employee_id
        })

    finally:

        if default_storage.exists(file_path):
            default_storage.delete(file_path)
# Create your views here.


def attendance_dashboard(request):
    today = timezone.localdate()

    total_employees = Employee.objects.filter(
        is_active=True
    ).count()

    present_today = Attendance.objects.filter(
        date=today,
        status='Present'
    ).count()

    late_today = Attendance.objects.filter(
        date=today,
        status='Late'
    ).count()

    absent_today = total_employees - present_today - late_today

    today_attendance = Attendance.objects.filter(
        date=today
    ).select_related('employee')

    context = {
        'today': today,
        'total_employees': total_employees,
        'present_today': present_today,
        'late_today': late_today,
        'absent_today': absent_today,
        'today_attendance': today_attendance,
    }

    return render(
        request,
        'attendance/dashboard.html',
        context
    )
    
    
def attendance_history(request):
    attendance_records = Attendance.objects.select_related(
        'employee'
    ).all()

    employee_id = request.GET.get('employee')
    date = request.GET.get('date')
    status = request.GET.get('status')

    if employee_id:
        attendance_records = attendance_records.filter(
            employee__employee_id=employee_id
        )

    if date:
        attendance_records = attendance_records.filter(
            date=date
        )

    if status:
        attendance_records = attendance_records.filter(
            status=status
        )

    employees = Employee.objects.filter(
        is_active=True
    )

    context = {
        'attendance_records': attendance_records,
        'employees': employees,
        'selected_employee': employee_id,
        'selected_date': date,
        'selected_status': status,
    }

    return render(
        request,
        'attendance/history.html',
        context
    )