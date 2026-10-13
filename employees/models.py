from django.db import models


class Shift(models.Model):
    name = models.CharField(max_length=100)
    start_time = models.TimeField(default='09:00:00')
    end_time = models.TimeField(default='18:00:00')
    grace_period_minutes = models.IntegerField(default=15)
    half_day_hours = models.FloatField(default=4.0)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.start_time} - {self.end_time})"


class Employee(models.Model):
    employee_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, default='')
    department = models.CharField(max_length=100)
    designation = models.CharField(max_length=100)
    face_image = models.ImageField(upload_to='employee_faces/', blank=True, null=True)
    shift_name = models.CharField(max_length=100, default='General Shift (09:00 - 18:00)')
    joining_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee_id} - {self.name}"

    @property
    def sample_count(self):
        return self.face_samples.count()


class EmployeeFaceSample(models.Model):
    SAMPLE_TYPES = [
        ('frontal', 'Frontal / Center'),
        ('left', 'Slight Left Angle'),
        ('right', 'Slight Right Angle'),
        ('expression', 'Natural / Smile Expression'),
        ('additional', 'Additional Angle'),
    ]

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='face_samples'
    )
    image = models.ImageField(upload_to='employee_faces/samples/')
    sample_type = models.CharField(max_length=30, choices=SAMPLE_TYPES, default='frontal')
    # 512-dimensional vector saved as a JSON list of floats
    embedding = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee.name} - {self.sample_type}"
