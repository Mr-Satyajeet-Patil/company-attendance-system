import json
import base64
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db.models import Q
from django.utils import timezone
from .models import Employee, EmployeeFaceSample, Shift
from .face_recognition import extract_face_embedding, ensure_legacy_employee_embeddings


# ==========================================
# REST API ENDPOINTS FOR REACT FRONTEND
# ==========================================

@csrf_exempt
def api_employees(request):
    """
    GET: List employees with optional search and filters.
    POST: Create a new employee.
    """
    if request.method == 'GET':
        search = request.GET.get('search', '').strip()
        dept = request.GET.get('department', '').strip()
        status = request.GET.get('status', '').strip()

        qs = Employee.objects.all().order_by('-id')

        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(employee_id__icontains=search) |
                Q(email__icontains=search) |
                Q(designation__icontains=search)
            )

        if dept and dept != 'All':
            qs = qs.filter(department__iexact=dept)

        if status:
            if status.lower() == 'active':
                qs = qs.filter(is_active=True)
            elif status.lower() == 'inactive':
                qs = qs.filter(is_active=False)

        data = []
        for emp in qs:
            data.append({
                'id': emp.id,
                'employee_id': emp.employee_id,
                'name': emp.name,
                'email': emp.email,
                'phone': emp.phone,
                'department': emp.department,
                'designation': emp.designation,
                'shift_name': emp.shift_name,
                'face_image': emp.face_image.url if emp.face_image else None,
                'sample_count': emp.face_samples.count(),
                'has_face_registered': emp.face_samples.count() > 0 or bool(emp.face_image),
                'is_active': emp.is_active,
                'joining_date': str(emp.joining_date) if emp.joining_date else None,
                'created_at': emp.created_at.strftime('%Y-%m-%d %H:%M'),
            })

        return JsonResponse({'success': True, 'employees': data, 'total': len(data)})

    elif request.method == 'POST':
        try:
            # Handle JSON or multipart form
            if request.content_type and 'application/json' in request.content_type:
                payload = json.loads(request.body.decode('utf-8'))
            else:
                payload = request.POST

            employee_id = payload.get('employee_id', '').strip()
            name = payload.get('name', '').strip()
            email = payload.get('email', '').strip()
            phone = payload.get('phone', '').strip()
            department = payload.get('department', 'General').strip()
            designation = payload.get('designation', 'Staff').strip()
            shift_name = payload.get('shift_name', 'General Shift (09:00 - 18:00)').strip()

            if not employee_id or not name or not email:
                return JsonResponse({'success': False, 'message': 'Employee ID, Name, and Email are required.'}, status=400)

            if Employee.objects.filter(employee_id=employee_id).exists():
                return JsonResponse({'success': False, 'message': f"Employee ID '{employee_id}' already exists."}, status=400)

            if Employee.objects.filter(email=email).exists():
                return JsonResponse({'success': False, 'message': f"Email '{email}' is already in use."}, status=400)

            emp = Employee.objects.create(
                employee_id=employee_id,
                name=name,
                email=email,
                phone=phone,
                department=department,
                designation=designation,
                shift_name=shift_name,
                is_active=True,
            )

            return JsonResponse({
                'success': True,
                'message': f"Employee '{name}' created successfully.",
                'employee': {
                    'id': emp.id,
                    'employee_id': emp.employee_id,
                    'name': emp.name,
                    'email': emp.email,
                    'department': emp.department,
                    'designation': emp.designation,
                    'shift_name': emp.shift_name,
                }
            }, status=201)

        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_employee_detail(request, employee_id):
    """
    GET, PUT, DELETE for specific employee.
    """
    try:
        emp = Employee.objects.get(id=employee_id)
    except Employee.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Employee not found.'}, status=404)

    if request.method == 'GET':
        samples = []
        for s in emp.face_samples.all():
            samples.append({
                'id': s.id,
                'sample_type': s.sample_type,
                'image_url': s.image.url if s.image else None,
                'has_embedding': bool(s.embedding),
                'created_at': s.created_at.strftime('%Y-%m-%d %H:%M'),
            })

        # Calculate quick attendance stats
        from attendance.models import Attendance
        total_presents = Attendance.objects.filter(employee=emp, status__in=['Present', 'Late']).count()
        total_late = Attendance.objects.filter(employee=emp, status='Late').count()

        return JsonResponse({
            'success': True,
            'employee': {
                'id': emp.id,
                'employee_id': emp.employee_id,
                'name': emp.name,
                'email': emp.email,
                'phone': emp.phone,
                'department': emp.department,
                'designation': emp.designation,
                'shift_name': emp.shift_name,
                'face_image': emp.face_image.url if emp.face_image else None,
                'is_active': emp.is_active,
                'sample_count': emp.face_samples.count(),
                'samples': samples,
                'stats': {
                    'total_presents': total_presents,
                    'total_late': total_late,
                }
            }
        })

    elif request.method in ['PUT', 'POST', 'PATCH']:
        try:
            if request.content_type and 'application/json' in request.content_type:
                payload = json.loads(request.body.decode('utf-8'))
            else:
                payload = request.POST

            if 'name' in payload:
                emp.name = payload['name']
            if 'email' in payload:
                emp.email = payload['email']
            if 'phone' in payload:
                emp.phone = payload['phone']
            if 'department' in payload:
                emp.department = payload['department']
            if 'designation' in payload:
                emp.designation = payload['designation']
            if 'shift_name' in payload:
                emp.shift_name = payload['shift_name']
            if 'is_active' in payload:
                emp.is_active = bool(payload['is_active'])

            emp.save()
            return JsonResponse({'success': True, 'message': 'Employee updated successfully.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    elif request.method == 'DELETE':
        permanent = request.GET.get('permanent', 'false').lower() == 'true'
        name = emp.name
        if permanent:
            emp.delete()
            return JsonResponse({'success': True, 'message': f"Employee '{name}' permanently removed."})
        else:
            emp.is_active = False
            emp.save()
            return JsonResponse({'success': True, 'message': f"Employee '{name}' deactivated."})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_register_multi_face(request, employee_id):
    """
    Registers 3-4 multi-angle face images for maximum biometric accuracy.
    Receives either:
    - Multipart files: 'frontal', 'left', 'right', 'expression'
    - Or JSON payload with base64 encoded images: { 'samples': [ { 'angle': 'frontal', 'image': 'data:image/jpeg;base64,...' }, ... ] }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'POST request required.'}, status=405)

    try:
        emp = Employee.objects.get(id=employee_id)
    except Employee.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Employee not found.'}, status=404)

    samples_registered = 0
    errors = []

    # Handle JSON base64 samples
    if request.content_type and 'application/json' in request.content_type:
        try:
            data = json.loads(request.body.decode('utf-8'))
            samples_data = data.get('samples', [])

            for item in samples_data:
                angle = item.get('angle', 'frontal')
                b64_str = item.get('image', '')

                if not b64_str:
                    continue

                if ',' in b64_str:
                    b64_str = b64_str.split(',', 1)[1]

                img_data = base64.b64decode(b64_str)
                filename = f"emp_{emp.employee_id}_{angle}_{timezone.now().strftime('%Y%m%d%H%M%S')}.jpg"
                file_content = ContentFile(img_data, name=filename)

                # Save sample
                sample = EmployeeFaceSample(employee=emp, sample_type=angle)
                sample.image.save(filename, file_content, save=True)

                # Extract embedding
                emb = extract_face_embedding(sample.image.path)
                if emb:
                    sample.embedding = emb
                    sample.save()
                    samples_registered += 1
                else:
                    errors.append(f"Face not clearly detected in {angle} shot.")

                # If frontal angle, also update employee primary face_image
                if angle == 'frontal' or not emp.face_image:
                    emp.face_image = sample.image
                    emp.save()

        except Exception as e:
            return JsonResponse({'success': False, 'message': f"Error processing JSON: {str(e)}"}, status=400)

    # Handle multipart form files
    else:
        angle_keys = ['frontal', 'left', 'right', 'expression']
        for key in angle_keys:
            uploaded_file = request.FILES.get(key)
            if not uploaded_file:
                # also check for names like sample_frontal or face_image
                uploaded_file = request.FILES.get(f'sample_{key}')
                if not uploaded_file and key == 'frontal':
                    uploaded_file = request.FILES.get('face_image')

            if uploaded_file:
                sample = EmployeeFaceSample(employee=emp, sample_type=key)
                sample.image.save(f"emp_{emp.employee_id}_{key}_{uploaded_file.name}", uploaded_file, save=True)

                emb = extract_face_embedding(sample.image.path)
                if emb:
                    sample.embedding = emb
                    sample.save()
                    samples_registered += 1
                else:
                    errors.append(f"Could not compute facial vector for '{key}' shot.")

                if key == 'frontal' or not emp.face_image:
                    emp.face_image = sample.image
                    emp.save()

    if samples_registered > 0:
        return JsonResponse({
            'success': True,
            'message': f"Successfully registered {samples_registered} biometric face angle(s) for {emp.name}.",
            'samples_registered': samples_registered,
            'total_samples': emp.face_samples.count(),
            'warnings': errors
        })
    else:
        return JsonResponse({
            'success': False,
            'message': 'No face could be successfully detected or processed. Please ensure good lighting and face visibility.',
            'errors': errors
        }, status=400)


@csrf_exempt
def api_departments(request):
    """
    Returns unique department list and employee counts.
    """
    from django.db.models import Count
    depts = Employee.objects.values('department').annotate(count=Count('id')).order_by('department')
    dept_list = [
        {'name': d['department'] or 'General', 'count': d['count']}
        for d in depts if d['department']
    ]

    # Defaults if empty
    default_depts = ['Engineering', 'Human Resources', 'Operations', 'Finance', 'Marketing', 'Sales', 'Product']
    existing_names = {d['name'] for d in dept_list}
    for d in default_depts:
        if d not in existing_names:
            dept_list.append({'name': d, 'count': 0})

    return JsonResponse({'success': True, 'departments': dept_list})


@csrf_exempt
def api_shifts(request):
    """
    List or create shifts.
    """
    if request.method == 'GET':
        shifts = Shift.objects.all().order_by('name')
        if not shifts.exists():
            # Seed standard shift
            Shift.objects.create(name='Standard General Shift', start_time='09:00:00', end_time='18:00:00', grace_period_minutes=15, is_default=True)
            Shift.objects.create(name='Morning Shift', start_time='07:00:00', end_time='16:00:00', grace_period_minutes=15)
            Shift.objects.create(name='Evening Shift', start_time='14:00:00', end_time='23:00:00', grace_period_minutes=15)
            shifts = Shift.objects.all().order_by('name')

        data = [{
            'id': s.id,
            'name': s.name,
            'start_time': s.start_time.strftime('%H:%M'),
            'end_time': s.end_time.strftime('%H:%M'),
            'grace_period_minutes': s.grace_period_minutes,
            'half_day_hours': s.half_day_hours,
            'is_default': s.is_default,
        } for s in shifts]

        return JsonResponse({'success': True, 'shifts': data})

    elif request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
            name = payload.get('name')
            start_time = payload.get('start_time', '09:00')
            end_time = payload.get('end_time', '18:00')
            grace = int(payload.get('grace_period_minutes', 15))

            shift = Shift.objects.create(
                name=name,
                start_time=start_time,
                end_time=end_time,
                grace_period_minutes=grace,
            )
            return JsonResponse({'success': True, 'shift_id': shift.id})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)


# ==========================================
# LEGACY HTML TEMPLATE COMPATIBILITY VIEWS
# ==========================================

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

            # Auto create sample & embedding
            emb = extract_face_embedding(employee.face_image.path)
            if emb:
                EmployeeFaceSample.objects.create(
                    employee=employee,
                    image=employee.face_image,
                    sample_type='frontal',
                    embedding=emb
                )

            return redirect('employee_list')

    return render(
        request,
        'employees/register_face.html',
        {'employee': employee}
    )
