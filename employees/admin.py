from django.contrib import admin
from .models import Employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        'employee_id',
        'name',
        'email',
        'department',
        'designation',
        'is_active',
    )

    search_fields = (
        'employee_id',
        'name',
        'email',
    )

    list_filter = (
        'department',
        'is_active',
    )
# Register your models here.
