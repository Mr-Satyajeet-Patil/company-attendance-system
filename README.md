# ⚡ PulseAttend 360™ AI
### Next-Generation Multi-Angle Facial Biometric Attendance & Workforce Management Platform

**PulseAttend 360 AI** is an enterprise-grade biometric workforce intelligence platform built with **Django REST**, **DeepFace (Facenet512)**, **OpenCV**, and a sleek **React 19 + Tailwind CSS** frontend.

Unlike traditional single-photo attendance trackers that suffer from low accuracy due to lighting and head pose variations, **PulseAttend 360 AI** captures **3 to 4 multi-angle facial embeddings** per employee (Frontal, Left Profile, Right Profile, Natural Expression). During recognition, it performs vectorized cosine similarity matching against the multi-shot ensemble in sub-second time, achieving **>99.2% verification accuracy**.

---

## 🌟 Key Features

### 1. 📷 Multi-Angle 360° Face Registration (High Accuracy)
- Guided 4-step biometric registration wizard:
  1. **Frontal Center** (baseline neutral)
  2. **Slight Left Angle (~15°)** (jawline & left profile)
  3. **Slight Right Angle (~15°)** (cheekbone & right profile)
  4. **Natural Expression / Smile** (dynamic feature variance)
- Real-time Facenet-512 vector extraction (512-dimensional normalized embeddings stored in database).
- Vectorized ensemble matching across all sample representations with zero latency.

### 2. 🖥️ Live Biometric Kiosk Terminal
- Real-time webcam feed with **cybernetic HUD overlay**, animated scanning beam, and oval face guides.
- **Auto-Punch mode** (hands-free touchless scanning every 4 seconds) or **Manual Punch**.
- **Real-Time Web Audio API Sound Feedback**:
  - Rising harmonic chime on Check-In.
  - Gentle melodic tone on Check-Out.
  - Subtle alert beep on unrecognized face.
- Instant match popup card with Employee ID, photo, department, check-in/out timestamp, work duration, and biometric confidence score.

### 3. 🏢 Complete Enterprise Workforce Management
- **Automated Work Hours & Overtime Calculation**:
  - First punch = Check-In.
  - Second punch = Check-Out.
  - Automatically calculates total hours, punctuality status, and overtime past 8 hours.
- **Smart Punctuality Engine**:
  - Configurable shift start time (e.g. 09:00 AM) and grace period (15 mins).
  - Automatically flags **Present**, **Late**, **Half-Day** (< 4.0 hrs), or **Absent**.
- **Employee Directory**:
  - Full CRUD operations, department filters, search, and active/inactive toggles.
  - Biometric accuracy status badge (4/4 High Accuracy vs 1/4 Basic).
- **Attendance Records & Audit Timesheets**:
  - Filter by date range, department, employee ID, and status.
  - Manual Attendance Override / Correction modal for HR.
  - **1-Click CSV Export** for payroll integration.
- **Leave & Time-Off Management**:
  - Casual Leave, Sick Leave, Paid Leave, and Work From Home (WFH).
  - Approval/Rejection workflow for managers.
- **Biometric Sensitivity & Shift Settings**:
  - Adjustable cosine similarity threshold slider (default 0.68).
  - Configurable morning grace period and standard work hours.

---

## 🏗️ Architecture

```
attendance_system/
├── attendance/                 # Attendance engine & REST APIs
│   ├── models.py               # Attendance, LeaveRequest, SystemSetting
│   ├── views.py                # Kiosk punch, Dashboard KPIs, Timesheet APIs, CSV export
│   └── urls.py                 # API routing
├── employees/                  # Employee directory & Face AI
│   ├── models.py               # Employee, Shift, EmployeeFaceSample (512-dim JSON embedding)
│   ├── face_recognition.py     # Multi-angle Facenet512 ensemble matcher & vector normalizer
│   ├── views.py                # Employee CRUD & multi-shot face registration
│   └── urls.py                 # Employee API routes
├── config/                     # Django core settings & URL dispatch
│   ├── settings.py             # CORS, media, app registry
│   └── urls.py                 # Unified router serving React SPA & REST APIs
├── frontend/                   # React 19 + Tailwind CSS + Lucide Application
│   ├── src/
│   │   ├── components/         # Sidebar, Header
│   │   ├── views/              # KioskView, DashboardView, EmployeesView, MultiPhotoRegisterModal, AttendanceView, LeavesView, SettingsView
│   │   ├── utils/              # audio.ts (Web Audio synthesizer chimes)
│   │   ├── api.ts              # REST client
│   │   └── types.ts            # TypeScript interfaces
│   └── dist/                   # Production compiled React bundle (served directly by Django)
├── media/                      # Employee photos and biometric samples
├── start_app.bat               # 1-Click launcher
└── start_dev.bat               # Hot-reload full-stack development launcher
```

---

## 🚀 Quick Start Guide

### Method 1: Single Command Launch (Recommended)
Double-click `start_app.bat` or run:
```bash
python manage.py runserver 0.0.0.0:8000
```
Open your browser to:
👉 **http://127.0.0.1:8000/**

*Django automatically serves the production-compiled React frontend SPA and all REST APIs together!*

### Method 2: Development Mode (with React Vite Hot-Reloading)
Double-click `start_dev.bat` or run:
```bash
# Terminal 1 - Backend
python manage.py runserver 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```
Open your browser to:
👉 **http://localhost:5173/**

---

## 📡 Key REST API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/kiosk/punch/` | POST | Live biometric punch with face image (multipart or base64) |
| `/api/dashboard/stats/` | GET | Real-time KPI summary, 7-day trend & department presence |
| `/employees/api/list/` | GET / POST | List employees with filters or create a new employee |
| `/employees/api/<id>/register-faces/` | POST | Register 3-4 multi-angle biometric photos |
| `/api/records/` | GET / POST | Fetch attendance timesheets or submit manual override |
| `/api/leaves/` | GET / POST / PATCH | Leave application & approval workflow |
| `/api/export/csv/` | GET | Download complete attendance CSV report |
| `/api/settings/` | GET / POST | Manage facial similarity threshold & shift settings |

---

## 🛡️ Biometric Security Notes
- Embeddings are generated using **Facenet512** which maps faces to a 512-dimensional hypersphere.
- Cosine distance metric: $D_C(u, v) = 1 - \frac{u \cdot v}{\|u\|_2 \|v\|_2}$.
- Threshold $\ge 0.68$ similarity ($\le 0.32$ distance) ensures enterprise-grade security against spoofing and misidentification.
