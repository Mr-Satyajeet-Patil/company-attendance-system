from django.db import models
from employees.models import Employee


class Attendance(models.Model):
    STATUS_CHOICES = [
        ('Present', 'Present'),
        ('Late', 'Late'),
        ('Half-Day', 'Half-Day'),
        ('Absent', 'Absent'),
        ('On Leave', 'On Leave'),
    ]

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )

    date = models.DateField()
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Present'
    )

    work_hours = models.FloatField(default=0.0)
    overtime_hours = models.FloatField(default=0.0)
    late_minutes = models.IntegerField(default=0)
    match_confidence = models.FloatField(default=0.0)  # e.g., 98.4 (%)
    matched_angle = models.CharField(max_length=50, blank=True, null=True)
    notes = models.CharField(max_length=255, blank=True, null=True)
    manual_override = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'date'],
                name='unique_employee_attendance_per_day'
            )
        ]
        ordering = ['-date', '-check_in']

    def __str__(self):
        return f"{self.employee.name} - {self.date} ({self.status})"


class LeaveRequest(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    LEAVE_TYPES = [
        ('Casual Leave', 'Casual Leave'),
        ('Sick Leave', 'Sick Leave'),
        ('Paid Leave', 'Paid Leave'),
        ('Work From Home', 'Work From Home'),
    ]

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='leave_requests'
    )
    leave_type = models.CharField(max_length=50, choices=LEAVE_TYPES, default='Casual Leave')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.employee.name} - {self.leave_type} ({self.status})"


class SystemSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.key}: {self.value}"
