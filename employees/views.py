from django.shortcuts import render
from .models import Employee


from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from .models import Employee


def employee_list(request):
    employees = Employee.objects.filter(is_active=True)

    return render(
        request,
        'employees/employee_list.html',
        {'employees': employees}
    )


def register_face(request, employee_id):
    employee = get_object_or_404(Employee, id=employee_id)

    if request.method == 'POST':
        image = request.FILES.get('face_image')

        if image:
            employee.face_image = image
            employee.save()

            messages.success(
                request,
                f'Face registered successfully for {employee.name}.'
            )

            return redirect('employee_list')

        messages.error(request, 'Please capture a face image.')

    return render(
        request,
        'employees/register_face.html',
        {'employee': employee}
    )
# Create your views here.
