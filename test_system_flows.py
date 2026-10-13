import os
import sys
import json
import base64
import urllib.request
import urllib.error

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000"

def log_test(name, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name} {f'-> {detail}' if detail else ''}")

def run_tests():
    print("=" * 60)
    print("RUNNING COMPREHENSIVE PULSEATTEND 360 FLOW & FLAW TESTS")
    print("=" * 60)

    # 1. Test Root SPA and Asset Bundles
    try:
        req = urllib.request.urlopen(f"{BASE_URL}/")
        html = req.read().decode('utf-8')
        log_test("GET / (SPA Home)", req.status == 200 and '<div id="root">' in html, f"Length: {len(html)} bytes")
        
        # Check assets
        import re
        assets = re.findall(r'/assets/[a-zA-Z0-9_\-\.]+', html)
        for asset in assets:
            a_res = urllib.request.urlopen(f"{BASE_URL}{asset}")
            log_test(f"Asset loading: {asset}", a_res.status == 200, f"Size: {len(a_res.read())} bytes")
    except Exception as e:
        log_test("SPA Loading", False, str(e))

    # 2. Test Dashboard Stats API
    try:
        req = urllib.request.urlopen(f"{BASE_URL}/api/dashboard/stats/")
        data = json.loads(req.read().decode('utf-8'))
        log_test("GET /api/dashboard/stats/", data.get('success') is True, f"Employees: {data['summary']['total_employees']}, Rate: {data['summary']['attendance_rate']}%")
    except Exception as e:
        log_test("GET /api/dashboard/stats/", False, str(e))

    # 3. Test Employee Listing and Filtering
    try:
        req = urllib.request.urlopen(f"{BASE_URL}/employees/api/list/")
        data = json.loads(req.read().decode('utf-8'))
        log_test("GET /employees/api/list/", data.get('success') is True, f"Total count: {data.get('total')}")
    except Exception as e:
        log_test("GET /employees/api/list/", False, str(e))

    # 4. Test Employee Creation with Valid and Invalid data
    new_emp_id = "TEST_999"
    try:
        payload = json.dumps({
            "employee_id": new_emp_id,
            "name": "Integration Test Employee",
            "email": "integration_test@pulseattend.com",
            "phone": "+1-555-0199",
            "department": "Engineering",
            "designation": "QA Automation Lead",
            "shift_name": "General Shift (09:00 - 18:00)"
        }).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/employees/api/list/", data=payload, headers={'Content-Type': 'application/json'}, method='POST')
        res = urllib.request.urlopen(req)
        emp_data = json.loads(res.read().decode('utf-8'))
        log_test("POST /employees/api/list/ (Create)", emp_data.get('success') is True, f"ID: {emp_data.get('employee', {}).get('id')}")
        created_id = emp_data.get('employee', {}).get('id')
    except Exception as e:
        log_test("POST /employees/api/list/ (Create)", False, str(e))
        created_id = None

    # Test Duplicate Employee ID rejection
    try:
        req = urllib.request.Request(f"{BASE_URL}/employees/api/list/", data=payload, headers={'Content-Type': 'application/json'}, method='POST')
        urllib.request.urlopen(req)
        log_test("Duplicate Employee ID Rejection", False, "Should have thrown 400 error")
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode('utf-8'))
        log_test("Duplicate Employee ID Rejection", e.code == 400 and body.get('success') is False, body.get('message'))
    except Exception as e:
        log_test("Duplicate Employee ID Rejection", False, str(e))

    # 5. Test Employee Detail API
    if created_id:
        try:
            req = urllib.request.urlopen(f"{BASE_URL}/employees/api/{created_id}/")
            data = json.loads(req.read().decode('utf-8'))
            log_test(f"GET /employees/api/{created_id}/ (Detail)", data.get('success') is True, data.get('employee', {}).get('name'))
        except Exception as e:
            log_test("GET /employees/api/<id>/", False, str(e))

    # 6. Test Multi-Angle Face Registration Endpoint
    if created_id:
        try:
            # Create a small valid test JPEG in base64
            # We can use one of the existing sample faces in media/employee_faces/face.jpg
            sample_img_path = "media/employee_faces/face.jpg"
            if os.path.exists(sample_img_path):
                with open(sample_img_path, "rb") as f:
                    b64_sample = base64.b64encode(f.read()).decode('utf-8')
                
                multi_payload = json.dumps({
                    "samples": [
                        {"angle": "frontal", "image": f"data:image/jpeg;base64,{b64_sample}"},
                        {"angle": "left", "image": f"data:image/jpeg;base64,{b64_sample}"},
                        {"angle": "right", "image": f"data:image/jpeg;base64,{b64_sample}"},
                        {"angle": "expression", "image": f"data:image/jpeg;base64,{b64_sample}"}
                    ]
                }).encode('utf-8')

                req = urllib.request.Request(
                    f"{BASE_URL}/employees/api/{created_id}/register-faces/",
                    data=multi_payload,
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )
                res = urllib.request.urlopen(req)
                res_data = json.loads(res.read().decode('utf-8'))
                log_test("POST /employees/api/<id>/register-faces/", res_data.get('success') is True, f"Registered: {res_data.get('samples_registered')}")
            else:
                log_test("Multi-Angle Registration", False, "Sample face image not found")
        except Exception as e:
            log_test("Multi-Angle Registration", False, str(e))

    # 7. Test Attendance Records & Timesheets API
    try:
        req = urllib.request.urlopen(f"{BASE_URL}/api/records/")
        data = json.loads(req.read().decode('utf-8'))
        log_test("GET /api/records/", data.get('success') is True, f"Total records: {data.get('total')}")
    except Exception as e:
        log_test("GET /api/records/", False, str(e))

    # 8. Test Manual Attendance Override
    if created_id:
        try:
            manual_payload = json.dumps({
                "employee_id": created_id,
                "date": "2026-10-13",
                "check_in": "09:05",
                "check_out": "17:35",
                "status": "Present",
                "notes": "Verified by automated unit test"
            }).encode('utf-8')
            req = urllib.request.Request(
                f"{BASE_URL}/api/records/",
                data=manual_payload,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            res = urllib.request.urlopen(req)
            data = json.loads(res.read().decode('utf-8'))
            log_test("POST /api/records/ (Manual Override)", data.get('success') is True, data.get('message'))
        except Exception as e:
            log_test("POST /api/records/ (Manual Override)", False, str(e))

    # 9. Test Leave Workflow
    if created_id:
        leave_id = None
        try:
            leave_payload = json.dumps({
                "employee_id": created_id,
                "leave_type": "Casual Leave",
                "start_date": "2026-10-20",
                "end_date": "2026-10-22",
                "reason": "Family vacation"
            }).encode('utf-8')
            req = urllib.request.Request(
                f"{BASE_URL}/api/leaves/",
                data=leave_payload,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            res = urllib.request.urlopen(req)
            data = json.loads(res.read().decode('utf-8'))
            log_test("POST /api/leaves/ (Apply Leave)", data.get('success') is True, f"Leave ID: {data.get('id')}")
            leave_id = data.get('id')
        except Exception as e:
            log_test("POST /api/leaves/", False, str(e))

        if leave_id:
            try:
                patch_payload = json.dumps({
                    "leave_id": leave_id,
                    "status": "Approved"
                }).encode('utf-8')
                req = urllib.request.Request(
                    f"{BASE_URL}/api/leaves/",
                    data=patch_payload,
                    headers={'Content-Type': 'application/json'},
                    method='PATCH'
                )
                res = urllib.request.urlopen(req)
                data = json.loads(res.read().decode('utf-8'))
                log_test("PATCH /api/leaves/ (Approve Leave)", data.get('success') is True, data.get('message'))
            except Exception as e:
                log_test("PATCH /api/leaves/ (Approve Leave)", False, str(e))

    # 10. Test CSV Export API
    try:
        req = urllib.request.urlopen(f"{BASE_URL}/api/export/csv/")
        csv_data = req.read().decode('utf-8')
        lines = csv_data.strip().split('\n')
        log_test("GET /api/export/csv/ (CSV Export)", req.status == 200 and 'Record ID' in lines[0], f"Exported {len(lines)} CSV rows")
    except Exception as e:
        log_test("GET /api/export/csv/", False, str(e))

    # 11. Test System Settings API
    try:
        req = urllib.request.urlopen(f"{BASE_URL}/api/settings/")
        data = json.loads(req.read().decode('utf-8'))
        log_test("GET /api/settings/", data.get('success') is True, f"Company: {data.get('settings', {}).get('company_name')}")
        
        # Test updating settings
        settings_payload = json.dumps({
            "company_name": "PulseAttend 360 Inc.",
            "recognition_threshold": "0.68",
            "grace_period_mins": "15"
        }).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/api/settings/", data=settings_payload, headers={'Content-Type': 'application/json'}, method='POST')
        res = urllib.request.urlopen(req)
        s_data = json.loads(res.read().decode('utf-8'))
        log_test("POST /api/settings/ (Update)", s_data.get('success') is True, s_data.get('message'))
    except Exception as e:
        log_test("Settings API", False, str(e))

    # 12. Edge Case Tests: Biometric Punch with corrupted / empty image
    try:
        bad_punch = json.dumps({"image": "invalid_base64_data"}).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/api/kiosk/punch/", data=bad_punch, headers={'Content-Type': 'application/json'}, method='POST')
        res = urllib.request.urlopen(req)
        p_data = json.loads(res.read().decode('utf-8'))
        # Should gracefully return matched: False, not crash with 500
        log_test("Kiosk Punch Error Handling (Corrupted Data)", p_data.get('matched') is False, p_data.get('message'))
    except urllib.error.HTTPError as e:
        log_test("Kiosk Punch Error Handling (HTTP Error)", e.code in [200, 400], f"Code: {e.code}")
    except Exception as e:
        log_test("Kiosk Punch Error Handling", False, str(e))

    # Clean up test employee
    if created_id:
        try:
            req = urllib.request.Request(f"{BASE_URL}/employees/api/{created_id}/?permanent=true", method='DELETE')
            urllib.request.urlopen(req)
            log_test("DELETE Test Employee cleanup", True)
        except Exception:
            pass

    print("=" * 60)
    print("FLOW AND FLAW TESTING COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
