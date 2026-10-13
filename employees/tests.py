import json
from django.test import TestCase, Client
from django.db import IntegrityError
from employees.models import Employee, Shift, EmployeeFaceSample


class EmployeeModelTests(TestCase):
    def setUp(self):
        self.shift = Shift.objects.create(
            name="General Shift",
            start_time="09:00:00",
            end_time="18:00:00",
            grace_period_minutes=15
        )
        self.employee = Employee.objects.create(
            employee_id="EMP-100",
            name="Alice Walker",
            email="alice@company.com",
            phone="+91-9876543210",
            department="Engineering",
            designation="Backend Engineer",
            shift_name="General Shift"
        )

    def test_employee_creation_and_str(self):
        self.assertEqual(str(self.employee), "EMP-100 - Alice Walker")
        self.assertTrue(self.employee.is_active)
        self.assertEqual(self.employee.sample_count, 0)

    def test_unique_employee_id_constraint(self):
        with self.assertRaises(IntegrityError):
            Employee.objects.create(
                employee_id="EMP-100",
                name="Duplicate Alice",
                email="alice2@company.com"
            )

    def test_unique_email_constraint(self):
        with self.assertRaises(IntegrityError):
            Employee.objects.create(
                employee_id="EMP-101",
                name="Duplicate Email",
                email="alice@company.com"
            )

    def test_face_sample_relation(self):
        sample = EmployeeFaceSample.objects.create(
            employee=self.employee,
            sample_type="frontal",
            embedding=[0.05] * 512
        )
        self.assertEqual(self.employee.sample_count, 1)
        self.assertEqual(str(sample), "Alice Walker - frontal")


class EmployeeAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.employee = Employee.objects.create(
            employee_id="EMP-200",
            name="Bob Smith",
            email="bob@company.com",
            department="Product",
            designation="Designer"
        )

    def test_api_employees_list(self):
        response = self.client.get('/employees/api/list/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['total'], 1)
        self.assertEqual(data['employees'][0]['name'], "Bob Smith")

    def test_api_employees_filter_and_search(self):
        # Search by name
        res = self.client.get('/employees/api/list/?search=Bob')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['total'], 1)

        # Search by non-matching query
        res_none = self.client.get('/employees/api/list/?search=NonExistent')
        self.assertEqual(res_none.status_code, 200)
        self.assertEqual(res_none.json()['total'], 0)

    def test_api_create_employee_success(self):
        payload = {
            "employee_id": "EMP-201",
            "name": "Charlie Brown",
            "email": "charlie@company.com",
            "department": "Marketing",
            "designation": "Growth Lead"
        }
        response = self.client.post(
            '/employees/api/list/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['employee']['name'], "Charlie Brown")
        self.assertTrue(Employee.objects.filter(employee_id="EMP-201").exists())

    def test_api_create_employee_duplicate_rejection(self):
        payload = {
            "employee_id": "EMP-200",  # Already exists
            "name": "Duplicate Bob",
            "email": "diff_bob@company.com"
        }
        response = self.client.post(
            '/employees/api/list/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn("already exists", data['message'])

    def test_api_employee_detail_and_update(self):
        # GET Detail
        res = self.client.get(f'/employees/api/{self.employee.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['employee']['employee_id'], "EMP-200")

        # Update designation
        update_res = self.client.put(
            f'/employees/api/{self.employee.id}/',
            data=json.dumps({"designation": "Principal Designer"}),
            content_type='application/json'
        )
        self.assertEqual(update_res.status_code, 200)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.designation, "Principal Designer")

    def test_api_employee_soft_and_permanent_delete(self):
        # Soft-delete (default)
        res_soft = self.client.delete(f'/employees/api/{self.employee.id}/')
        self.assertEqual(res_soft.status_code, 200)
        self.employee.refresh_from_db()
        self.assertFalse(self.employee.is_active)

        # Permanent delete
        res_perm = self.client.delete(f'/employees/api/{self.employee.id}/?permanent=true')
        self.assertEqual(res_perm.status_code, 200)
        self.assertFalse(Employee.objects.filter(id=self.employee.id).exists())
