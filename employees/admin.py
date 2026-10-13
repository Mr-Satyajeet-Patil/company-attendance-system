from django.contrib import admin
from .models import Employee, EmployeeFaceSample, Shift


class EmployeeFaceSampleInline(admin.TabularInline):
    model = EmployeeFaceSample
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        'employee_id',
        'name',
        'department',
        'designation',
        'shift_name',
        'sample_count',
        'is_active',
    )
    search_fields = ('employee_id', 'name', 'email', 'department')
    list_filter = ('department', 'shift_name', 'is_active')
    inlines = [EmployeeFaceSampleInline]


@admin.register(EmployeeFaceSample)
class EmployeeFaceSampleAdmin(admin.ModelAdmin):
    list_display = ('employee', 'sample_type', 'created_at')
    list_filter = ('sample_type',)
    search_fields = ('employee__name', 'employee__employee_id')


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_time', 'end_time', 'grace_period_minutes', 'is_default')
