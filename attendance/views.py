
import os

from django.shortcuts import render
from django.http import JsonResponse
from django.utils import timezone
from django.core.files.storage import default_storage

from employees.face_recognition import recognize_employee
from .models import Attendance


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
