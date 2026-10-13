from django.contrib import admin
from .models import Attendance, LeaveRequest, SystemSetting


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = (
        'employee',
        'date',
        'check_in',
        'check_out',
        'work_hours',
        'status',
        'match_confidence',
    )
    list_filter = ('status', 'date')
    search_fields = ('employee__name', 'employee__employee_id')


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = (
        'employee',
        'leave_type',
        'start_date',
        'end_date',
        'status',
        'applied_at',
    )
    list_filter = ('status', 'leave_type')
    search_fields = ('employee__name', 'employee__employee_id')


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'description')
