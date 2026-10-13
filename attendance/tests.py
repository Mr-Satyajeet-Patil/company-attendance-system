import json
from datetime import date, time, timedelta
from django.test import TestCase, Client
from django.db import IntegrityError
from employees.models import Employee, Shift
from attendance.models import Attendance, LeaveRequest, SystemSetting


class AttendanceModelTests(TestCase):
    def setUp(self):
        self.employee = Employee.objects.create(
            employee_id="EMP-300",
            name="Diana Prince",
            email="diana@company.com",
            department="Operations",
            designation="Manager"
        )
        self.today = date.today()

    def test_attendance_creation_and_unique_constraint(self):
        att = Attendance.objects.create(
            employee=self.employee,
            date=self.today,
            check_in=time(9, 0),
            status="Present"
        )
        self.assertIn("Diana Prince", str(att))

        # Test unique employee attendance per day constraint
        with self.assertRaises(IntegrityError):
            Attendance.objects.create(
                employee=self.employee,
                date=self.today,
                check_in=time(10, 0),
                status="Late"
            )

    def test_leave_request_creation_and_status(self):
        leave = LeaveRequest.objects.create(
            employee=self.employee,
            leave_type="Paid Leave",
            start_date=self.today,
            end_date=self.today + timedelta(days=2),
            reason="Medical recovery"
        )
        self.assertEqual(leave.status, "Pending")
        self.assertIn("Paid Leave", str(leave))

    def test_system_settings(self):
        setting = SystemSetting.objects.create(
            key="test_key",
            value="test_val"
        )
        self.assertEqual(str(setting), "test_key: test_val")


class AttendanceAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.employee = Employee.objects.create(
            employee_id="EMP-400",
            name="Evan Wright",
            email="evan@company.com",
            department="IT",
            designation="Network Admin"
        )
        self.today = date.today()

    def test_api_dashboard_stats(self):
        # Create an attendance record
        Attendance.objects.create(
            employee=self.employee,
            date=self.today,
            check_in=time(9, 5),
            status="Present"
        )

        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['summary']['total_employees'], 1)
        self.assertEqual(data['summary']['present_today'], 1)
        self.assertEqual(data['summary']['attendance_rate'], 100.0)

    def test_api_attendance_records_list(self):
        Attendance.objects.create(
            employee=self.employee,
            date=self.today,
            check_in=time(9, 0),
            check_out=time(18, 0),
            work_hours=9.0,
            status="Present"
        )

        response = self.client.get('/api/records/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['records']), 1)
        self.assertEqual(data['records'][0]['employee_name'], "Evan Wright")

    def test_api_manual_attendance_override(self):
        payload = {
            "employee_id": self.employee.id,
            "date": str(self.today),
            "check_in": "09:10",
            "check_out": "18:10",
            "status": "Present",
            "notes": "Manual punch test"
        }
        response = self.client.post(
            '/api/records/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])

        # Verify database record
        att = Attendance.objects.get(employee=self.employee, date=self.today)
        self.assertEqual(att.status, "Present")
        self.assertTrue(att.manual_override)
        self.assertEqual(att.work_hours, 9.0)

    def test_api_leave_workflow(self):
        # 1. Apply Leave
        apply_payload = {
            "employee_id": self.employee.id,
            "leave_type": "Sick Leave",
            "start_date": str(self.today),
            "end_date": str(self.today + timedelta(days=1)),
            "reason": "Flu symptoms"
        }
        res_apply = self.client.post(
            '/api/leaves/',
            data=json.dumps(apply_payload),
            content_type='application/json'
        )
        self.assertEqual(res_apply.status_code, 200)
        leave_id = res_apply.json()['id']

        # 2. List Leaves
        res_list = self.client.get('/api/leaves/?status=Pending')
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.json()['leaves']), 1)

        # 3. Approve Leave
        patch_payload = {
            "leave_id": leave_id,
            "status": "Approved"
        }
        res_approve = self.client.patch(
            '/api/leaves/',
            data=json.dumps(patch_payload),
            content_type='application/json'
        )
        self.assertEqual(res_approve.status_code, 200)
        leave = LeaveRequest.objects.get(id=leave_id)
        self.assertEqual(leave.status, "Approved")
        self.assertIsNotNone(leave.reviewed_at)

    def test_api_export_csv(self):
        Attendance.objects.create(
            employee=self.employee,
            date=self.today,
            check_in=time(9, 0),
            check_out=time(17, 30),
            work_hours=8.5,
            status="Present",
            match_confidence=99.1
        )
        response = self.client.get('/api/export/csv/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('PulseAttend_Report_', response['Content-Disposition'])

        csv_content = response.content.decode('utf-8')
        lines = csv_content.strip().split('\n')
        self.assertTrue(len(lines) >= 2)
        self.assertIn("Record ID", lines[0])
        self.assertIn("Evan Wright", lines[1])

    def test_api_kiosk_punch_malformed_image_graceful_rejection(self):
        # Should gracefully return HTTP 400 Bad Request, never crash with HTTP 500
        bad_payload = {"image": "corrupted_non_base64_string"}
        response = self.client.post(
            '/api/kiosk/punch/',
            data=json.dumps(bad_payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertTrue(any(w in data['message'].lower() for w in ['base64', 'corrupt', 'small', 'invalid']))
